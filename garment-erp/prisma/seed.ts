/**
 * AHA Garment - Database Seed
 * 
 * Initializes the database with:
 * - 8 Departments (flow stages)
 * - 24 Jobs (rate carriers)
 * - 1 Admin user
 * 
 * Run with: npx tsx prisma/seed.ts
 */

import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const db = new PrismaClient();

// ═══════════════════════════════════════════════════════════
// Department → Jobs Mapping
// Based on AHA Garment master plan
// ═══════════════════════════════════════════════════════════

interface DeptSpec {
  nameAm: string;
  nameEn: string;
  flowOrder: number | null;
  controllers: Role[];
  jobs: Array<{ nameAm: string; nameEn: string; sortOrder: number }>;
}

const STRUCTURE: DeptSpec[] = [
  // 1. መቀበያና መጋዘን (Receiving & Store) — not in flow
  {
    nameAm: "መቀበያና መጋዘን",
    nameEn: "Receiving & Store",
    flowOrder: null, // not in production flow
    controllers: ["PRODUCTION_MANAGER", "STORE_KEEPER"],
    jobs: [
      { nameAm: "የመጋዘን ሹፌር", nameEn: "Warehouse Worker", sortOrder: 1 },
    ],
  },

  // 2. ቆራጭ (Cutting) — flow order 1
  {
    nameAm: "ቆራጭ",
    nameEn: "Cutting",
    flowOrder: 1,
    controllers: ["PRODUCTION_MANAGER", "CUTTING_MANAGER"],
    jobs: [
      { nameAm: "ቆራጭ", nameEn: "Cutter", sortOrder: 1 },
      { nameAm: "ቴብል ሰራተኛ", nameEn: "Table Worker", sortOrder: 2 },
      { nameAm: "ሂሳብ ቆጣሪ", nameEn: "Counter", sortOrder: 3 },
    ],
  },

  // 3. ስፌት (Sewing) — flow order 2
  {
    nameAm: "ስፌት",
    nameEn: "Sewing",
    flowOrder: 2,
    controllers: ["PRODUCTION_MANAGER", "LINE_SUPERVISOR"],
    jobs: [
      { nameAm: "የመስመር 1 ስፌት", nameEn: "Line 1 Sewing", sortOrder: 1 },
      { nameAm: "የመስመር 2 ስፌት", nameEn: "Line 2 Sewing", sortOrder: 2 },
      { nameAm: "ኦቨርሎክ", nameEn: "Overlock", sortOrder: 3 },
      { nameAm: "ዚግዛግ", nameEn: "Zigzag", sortOrder: 4 },
      { nameAm: "ዲዛይን ስፌት", nameEn: "Design Sewing", sortOrder: 5 },
    ],
  },

  // 4. ጥራት (Quality Control) — flow order 3
  {
    nameAm: "ጥራት",
    nameEn: "Quality Control",
    flowOrder: 3,
    controllers: ["PRODUCTION_MANAGER", "QC_INSPECTOR"],
    jobs: [
      { nameAm: "የመስመር ጥራት", nameEn: "Line QC", sortOrder: 1 },
      { nameAm: "የመጨረሻ ጥራት", nameEn: "Final QC", sortOrder: 2 },
    ],
  },

  // 5. ቅንጨባ (Trimming) — flow order 4
  {
    nameAm: "ቅንጨባ",
    nameEn: "Trimming",
    flowOrder: 4,
    controllers: ["PRODUCTION_MANAGER", "LINE_SUPERVISOR"],
    jobs: [
      { nameAm: "የመስመር 1 ቅንጨባ", nameEn: "Line 1 Trimming", sortOrder: 1 },
      { nameAm: "የመስመር 2 ቅንጨባ", nameEn: "Line 2 Trimming", sortOrder: 2 },
      { nameAm: "ማጽጃ", nameEn: "Cleaner", sortOrder: 3 },
    ],
  },

  // 6. ስታይል (Styling/Hot Press) — flow order 5
  {
    nameAm: "ስታይል",
    nameEn: "Styling",
    flowOrder: 5,
    controllers: ["PRODUCTION_MANAGER"],
    jobs: [
      { nameAm: "ስታይል 1", nameEn: "Stylist 1", sortOrder: 1 },
      { nameAm: "ስታይል 2", nameEn: "Stylist 2", sortOrder: 2 },
      { nameAm: "ሆት ፕሬስ", nameEn: "Hot Press", sortOrder: 3 },
    ],
  },

  // 7. ማሳያ (Ironing/Finishing) — flow order 6
  {
    nameAm: "ማሳያ",
    nameEn: "Ironing",
    flowOrder: 6,
    controllers: ["PRODUCTION_MANAGER"],
    jobs: [
      { nameAm: "አዩት 1", nameEn: "Ironer 1", sortOrder: 1 },
      { nameAm: "አዩት 2", nameEn: "Ironer 2", sortOrder: 2 },
      { nameAm: "ማሳያ", nameEn: "Finisher", sortOrder: 3 },
    ],
  },

  // 8. ማሸጊያ (Packing) — flow order 7
  {
    nameAm: "ማሸጊያ",
    nameEn: "Packing",
    flowOrder: 7,
    controllers: ["PRODUCTION_MANAGER"],
    jobs: [
      { nameAm: "ማሸጊያ 1", nameEn: "Packer 1", sortOrder: 1 },
      { nameAm: "ማሸጊያ 2", nameEn: "Packer 2", sortOrder: 2 },
      { nameAm: "የስብሰባ ሰራተኛ", nameEn: "Assembly Worker", sortOrder: 3 },
    ],
  },

  // 9. አስተዳደር (Administration) — not in flow
  {
    nameAm: "አስተዳደር",
    nameEn: "Administration",
    flowOrder: null,
    controllers: ["PRODUCTION_MANAGER"],
    jobs: [
      { nameAm: "አስተዳዳሪ", nameEn: "Administrator", sortOrder: 1 },
      { nameAm: "ጠበቃ", nameEn: "Guard", sortOrder: 2 },
      { nameAm: "ጸዳት", nameEn: "Cleaner", sortOrder: 3 },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding database...\n");

  // ═══════════════════════════════════════════════════════════
  // 1. Create Departments and Jobs
  // ═══════════════════════════════════════════════════════════

  console.log("📦 Creating departments and jobs...");

  for (const deptSpec of STRUCTURE) {
    // Create department
    const dept = await db.department.upsert({
      where: { nameAm: deptSpec.nameAm },
      update: {
        nameEn: deptSpec.nameEn,
        flowOrder: deptSpec.flowOrder,
        controllers: deptSpec.controllers,
        isActive: true,
      },
      create: {
        nameAm: deptSpec.nameAm,
        nameEn: deptSpec.nameEn,
        flowOrder: deptSpec.flowOrder,
        controllers: deptSpec.controllers,
        isActive: true,
      },
    });

    console.log(`  ✓ ${deptSpec.nameAm} (${deptSpec.jobs.length} jobs)`);

    // Create jobs for this department
    for (const jobSpec of deptSpec.jobs) {
      await db.job.upsert({
        where: {
          departmentId_nameAm: {
            departmentId: dept.id,
            nameAm: jobSpec.nameAm,
          },
        },
        update: {
          nameEn: jobSpec.nameEn,
          sortOrder: jobSpec.sortOrder,
          isActive: true,
        },
        create: {
          departmentId: dept.id,
          nameAm: jobSpec.nameAm,
          nameEn: jobSpec.nameEn,
          sortOrder: jobSpec.sortOrder,
          isActive: true,
        },
      });
    }
  }

  console.log("\n✅ Departments and jobs created\n");

  // ═══════════════════════════════════════════════════════════
  // 2. Create Admin User
  // ═══════════════════════════════════════════════════════════

  console.log("👤 Creating admin user...");

  const adminPIN = "123456"; // Change this in production!
  const pinHash = await bcrypt.hash(adminPIN, 10);

  const admin = await db.appUser.upsert({
    where: { employeeCode: "ADM-001" },
    update: {
      pinHash,
      role: "ADMIN",
      isActive: true,
      nameAm: "ባለቤት",
    },
    create: {
      employeeCode: "ADM-001",
      pinHash,
      role: "ADMIN",
      isActive: true,
      nameAm: "ባለቤት",
    },
  });

  console.log(`  ✓ Admin user: ${admin.employeeCode} (PIN: ${adminPIN})`);
  console.log("\n✅ Admin user created\n");

  // ═══════════════════════════════════════════════════════════
  // 3. Create Default Salary Settings
  // ═══════════════════════════════════════════════════════════

  console.log("💰 Creating default salary settings...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await db.salarySetting.upsert({
    where: { id: "default" },
    update: {
      attendanceBonus: 500,
      effectiveFrom: today,
      setByUserId: admin.id,
    },
    create: {
      id: "default",
      attendanceBonus: 500,
      effectiveFrom: today,
      setByUserId: admin.id,
    },
  });

  console.log("  ✓ Attendance bonus: 500 ETB");
  console.log("\n✅ Salary settings created\n");

  // ═══════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════

  const deptCount = await db.department.count();
  const jobCount = await db.job.count();
  const userCount = await db.appUser.count();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Database seeded successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`\n📊 Summary:`);
  console.log(`  • ${deptCount} departments`);
  console.log(`  • ${jobCount} jobs`);
  console.log(`  • ${userCount} users`);
  console.log(`\n🔐 Default Login:`);
  console.log(`  Employee Code: ADM-001`);
  console.log(`  PIN: ${adminPIN}`);
  console.log(`  ⚠️  Change this PIN in production!\n`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
