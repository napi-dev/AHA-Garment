/**
 * Check existing hourly count data
 * Run with: npx tsx src/lib/db/check-counts.ts
 */

import { db } from "./index";
import { getEffectiveDate } from "../date-override/effective-date";

async function main() {
  console.log("🔍 Checking hourly count data...\n");

  const today = await getEffectiveDate();
  today.setUTCHours(0, 0, 0, 0);
  console.log(`📅 Checking date: ${today.toISOString().split("T")[0]}\n`);

  // Get all sheets for today
  const sheets = await db.hourlyCountSheet.findMany({
    where: { date: today },
    include: {
      operation: true,
      lines: {
        include: {
          employee: true,
          department: true,
        },
      },
    },
  });

  console.log(`📊 Found ${sheets.length} count sheets for today\n`);

  if (sheets.length === 0) {
    console.log("⚠️  No count data exists for today.");
    console.log("   Run: npm run db:seed-test-counts to create sample data\n");
    return;
  }

  for (const sheet of sheets) {
    console.log(`\n📋 Sheet: ${sheet.operation.nameAm} (${sheet.operation.nameEn})`);
    console.log(`   Status: ${sheet.status}`);
    console.log(`   Lines: ${sheet.lines.length} employees\n`);

    for (const line of sheet.lines.slice(0, 5)) { // Show first 5
      const hours = [line.h1, line.h2, line.h3, line.h4, line.h5, line.h6, line.h7, line.h8];
      const hoursDisplay = hours.map(h => h ?? "—").join(", ");
      
      console.log(`   ${line.employee.nameAm} (${line.department.nameAm}):`);
      console.log(`     Hours: [${hoursDisplay}]`);
      console.log(`     Total: ${line.totalProduced} (Target: ${line.targetForDay})`);
      console.log(`     Plus: ${line.plusPieces}, Minus: ${line.minusPieces}, Mistakes: ${line.mistakes}`);
    }

    if (sheet.lines.length > 5) {
      console.log(`   ... and ${sheet.lines.length - 5} more employees`);
    }
  }

  // Check incentive cards
  console.log("\n\n💰 Checking incentive cards...\n");

  const cards = await db.incentiveCard.findMany({
    where: {
      effectiveFrom: { lte: today },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
    },
    include: {
      department: true,
    },
    orderBy: { effectiveFrom: "desc" },
  });

  console.log(`   Found ${cards.length} active incentive cards\n`);

  for (const card of cards) {
    console.log(`   ${card.department.nameAm}:`);
    console.log(`     Target: ${card.targetPerHour}/hour`);
    console.log(`     Rate: ${card.ratePerPiece} ETB/piece`);
    console.log(`     Effective: ${card.effectiveFrom.toISOString().split("T")[0]} → ${card.effectiveTo?.toISOString().split("T")[0] ?? "current"}`);
  }

  // Check if incentive periods exist
  console.log("\n\n📅 Checking incentive periods...\n");

  const periods = await db.incentivePeriod.findMany({
    orderBy: { startDate: "desc" },
    take: 3,
  });

  if (periods.length === 0) {
    console.log("   ⚠️  No incentive periods created yet");
  } else {
    for (const period of periods) {
      console.log(`   Period ${period.periodNumber} - ${period.ethMonth}/${period.ethYear}:`);
      console.log(`     Dates: ${period.startDate.toISOString().split("T")[0]} → ${period.endDate.toISOString().split("T")[0]}`);
      console.log(`     Status: ${period.status}`);
      
      const lineCount = await db.incentiveLine.count({ where: { periodId: period.id } });
      console.log(`     Incentive lines: ${lineCount}`);
    }
  }

  console.log("\n✅ Done!\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
