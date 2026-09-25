/**
 * One-time backfill: assigns EMP-001, EMP-002 … to all employees
 * that have no employeeCode yet.
 *
 * Run with: npx tsx src/lib/db/backfill-codes.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  log: ["error"],
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

async function main() {
  const emps = await db.employee.findMany({
    where: { employeeCode: null },
    orderBy: { serialNumber: "asc" },
  });

  if (emps.length === 0) {
    console.log("✅ All employees already have a code.");
    return;
  }

  console.log(`Backfilling ${emps.length} employees…`);
  for (const e of emps) {
    const code = `EMP-${String(e.serialNumber).padStart(3, "0")}`;
    await db.employee.update({
      where: { id: e.id },
      data: { employeeCode: code },
    });
    process.stdout.write(`  ${e.nameAm} → ${code}\n`);
  }
  console.log("✅ Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
