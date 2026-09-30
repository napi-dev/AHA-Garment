/**
 * fix-admin-dept.ts
 *
 * Creates an "አስተዳደር" (Management) department and reassigns all system/controller
 * users' employee records to it, so they no longer show as "ትከሻ (ፍሬንት)".
 *
 * Run once:  npm run db:fix-admin-dept
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  log: ["error"],
  datasources: { db: { url: process.env.DIRECT_URL } },
});

const CONTROLLER_CODES = [
  "ADM-001", "MGR-001", "STK-001", "CUT-001",
  "PRD-001", "QCI-001", "FGM-001", "HRC-001", "OPR-001",
];

async function main() {
  // 1. Upsert the management department (sortOrder=0 so it appears at top)
  const mgmtDept = await db.department.upsert({
    where:  { nameEn: "Management" },
    update: { nameAm: "አስተዳደር", isActive: false },
    create: {
      nameEn:    "Management",
      nameAm:    "አስተዳደር",
      sortOrder: 0,
      stage:     "SEWING",   // required field — least disruptive value
      isActive:  false,       // hidden from production dropdowns
    },
  });
  console.log(`✓ Management dept: ${mgmtDept.id} (isActive=false → hidden from production)`);

  // 2. For each controller user, find their linked employee and move to mgmt dept
  let moved = 0;
  for (const code of CONTROLLER_CODES) {
    const user = await db.appUser.findUnique({
      where:   { employeeCode: code },
      include: { employee: true },
    });
    if (!user) {
      console.log(`  ⚠ ${code} not found — skipping`);
      continue;
    }
    if (!user.employee) {
      console.log(`  ⚠ ${code} has no linked employee — skipping`);
      continue;
    }
    await db.employee.update({
      where: { id: user.employee.id },
      data:  { departmentId: mgmtDept.id },
    });
    console.log(`  ✓ ${code} (${user.employee.nameAm}) → አስተዳደር`);
    moved++;
  }

  console.log(`\n✅ Done — ${moved} users moved to አስተዳደር department.`);
  console.log(`   The department is marked isActive=false so it won't appear`);
  console.log(`   in production department selectors or attendance grids.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
