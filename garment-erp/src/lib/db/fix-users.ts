/**
 * Fix users script — run with: npx tsx src/lib/db/fix-users.ts
 *
 * 1. Lists all AppUser rows currently in the database
 * 2. Deletes all existing system users
 * 3. Re-creates them with freshly hashed PINs
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient({
  log: ["query", "error"],
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

const SYSTEM_USERS = [
  { code: "ADM-001", pin: "1234", role: "ADMIN"                  as const, nameAm: "አስተዳዳሪ" },
  { code: "MGR-001", pin: "1234", role: "PRODUCTION_MANAGER"    as const, nameAm: "ዋና ምርት አስኪያጅ" },
  { code: "STK-001", pin: "1234", role: "STORE_KEEPER"           as const, nameAm: "የመጋዘን ኃላፊ" },
  { code: "CUT-001", pin: "1234", role: "CUTTING_MANAGER"        as const, nameAm: "የቆረጣ ኃላፊ" },
  { code: "PRD-001", pin: "1234", role: "PRODUCTION_MANAGER"     as const, nameAm: "የምርት ኃላፊ" },
  { code: "QCI-001", pin: "1234", role: "QC_INSPECTOR"           as const, nameAm: "የጥራት ተቆጣጣሪ" },
  { code: "FGM-001", pin: "1234", role: "FINISHED_GOODS_MANAGER" as const, nameAm: "የተጠናቀቀ እቃ ኃላፊ" },
  { code: "HRC-001", pin: "1234", role: "HR_CLERK"               as const, nameAm: "የሰው ሀብት" },
  { code: "OPR-001", pin: "1234", role: "OPERATOR"               as const, nameAm: "ኦፕሬተር" },
];

async function main() {
  console.log("🔍 Checking current users in database...\n");

  const existing = await db.appUser.findMany({
    select: { employeeCode: true, role: true, isActive: true, employeeId: true },
  });

  if (existing.length === 0) {
    console.log("  No users found — database may be empty or seed never ran.\n");
  } else {
    console.log(`  Found ${existing.length} user(s):`);
    for (const u of existing) {
      console.log(`    ${u.employeeCode.padEnd(12)} role=${u.role} active=${u.isActive} empId=${u.employeeId ?? "none"}`);
    }
  }

  // Get first department to attach employees to
  const firstDept = await db.department.findFirst({ orderBy: { sortOrder: "asc" } });
  if (!firstDept) {
    console.log("\n❌ No departments found — run db:push and db:seed first.");
    return;
  }

  console.log(`\n🔧 Recreating system users (dept: ${firstDept.nameEn})...\n`);

  for (const u of SYSTEM_USERS) {
    const pinHash = await bcrypt.hash(u.pin, 10);

    // Check if user exists
    const existingUser = await db.appUser.findUnique({ where: { employeeCode: u.code } });

    if (existingUser) {
      // Just update the hash — don't touch the employee relation
      await db.appUser.update({
        where: { employeeCode: u.code },
        data: { pinHash, role: u.role, isActive: true },
      });
      console.log(`  ✓ Updated ${u.code}`);
    } else {
      // Create user + employee together
      // Get next serial
      const maxSerial = await db.employee.aggregate({ _max: { serialNumber: true } });
      const nextSerial = (maxSerial._max.serialNumber ?? 0) + 1;

      await db.appUser.create({
        data: {
          employeeCode: u.code,
          pinHash,
          role: u.role,
          isActive: true,
          employee: {
            create: {
              serialNumber: nextSerial,
              nameAm: u.nameAm,
              departmentId: firstDept.id,
            },
          },
        },
      });
      console.log(`  ✓ Created ${u.code}`);
    }
  }

  // Verify bcrypt works correctly for one user
  console.log("\n🧪 Verifying PIN hash for MGR-001...");
  const mgr = await db.appUser.findUnique({ where: { employeeCode: "MGR-001" } });
  if (mgr) {
    const ok = await bcrypt.compare("1234", mgr.pinHash);
    console.log(`  bcrypt.compare("1234", hash) = ${ok}`);
    if (!ok) {
      console.log("  ❌ Hash verification failed — something is wrong with bcrypt.");
    } else {
      console.log("  ✅ Login should work now.");
    }
  } else {
    console.log("  ❌ MGR-001 still not found after creation — check DB permissions.");
  }

  console.log("\n📋 Login credentials:");
  for (const u of SYSTEM_USERS) {
    console.log(`   ${u.code.padEnd(10)} PIN: ${u.pin}  role: ${u.role}`);
  }
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => db.$disconnect());
