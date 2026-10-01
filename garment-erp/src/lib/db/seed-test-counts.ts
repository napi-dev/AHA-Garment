/**
 * Seed test hourly count data for the current effective date
 * Run with: npx tsx src/lib/db/seed-test-counts.ts
 */

import { db } from "./index";
import { getEffectiveDate } from "../date-override/effective-date";

async function main() {
  console.log("🌱 Seeding test hourly count data...\n");

  // Get the current effective date
  const today = await getEffectiveDate();
  today.setUTCHours(0, 0, 0, 0);
  console.log(`📅 Effective date: ${today.toISOString().split("T")[0]}`);

  // Create data for last 7 days including today
  const dates: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);
    dates.push(date);
  }

  console.log(`📅 Creating data for ${dates.length} dates:`);
  dates.forEach(d => console.log(`   - ${d.toISOString().split("T")[0]}`));

  // Get all active departments
  const departments = await db.department.findMany({
    where: { isActive: true },
    include: {
      employees: { where: { isActive: true }, take: 5 }, // First 5 employees per dept
    },
  });

  console.log(`\n📊 Found ${departments.length} active departments\n`);

  let totalCreated = 0;

  for (const targetDate of dates) {
    console.log(`\n📅 Processing date: ${targetDate.toISOString().split("T")[0]}`);

    for (const dept of departments) {
      if (dept.employees.length === 0) continue;

      // Get or create incentive card for this department
      let card = await db.incentiveCard.findFirst({
        where: {
          departmentId: dept.id,
          effectiveFrom: { lte: targetDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: targetDate } }],
        },
        orderBy: { effectiveFrom: "desc" },
      });

      if (!card) {
        // Create a default incentive card
        const admin = await db.appUser.findFirst({
          where: { role: "ADMIN" },
        });

        if (!admin) continue;

        card = await db.incentiveCard.create({
          data: {
            departmentId: dept.id,
            targetPerHour: 50, // Default target
            ratePerPiece: 0.5, // 0.50 ETB per piece
            effectiveFrom: new Date(targetDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            effectiveTo: null,
            setByUserId: admin.id,
          },
        });
      }

      // Get or create operation for this department
      const opMapping = await db.operationDeptMapping.findFirst({
        where: { departmentId: dept.id },
        include: { operation: true },
      });

      let operationId: string;
      if (opMapping) {
        operationId = opMapping.operationId;
      } else {
        const operation = await db.operation.upsert({
          where: { nameEn: "Test Operation" },
          update: {},
          create: {
            nameEn: "Test Operation",
            nameAm: "የሙከራ ሥራ",
            sortOrder: 1,
          },
        });
        operationId = operation.id;
      }

      // Create or get the count sheet
      const sheet = await db.hourlyCountSheet.upsert({
        where: { date_operationId: { date: targetDate, operationId } },
        update: {},
        create: {
          date: targetDate,
          operationId,
          supervisorId: (await db.appUser.findFirst({ where: { role: { in: ["ADMIN", "PRODUCTION_MANAGER"] } } }))!.id,
          status: "SUBMITTED",
        },
      });

      // Create test hourly counts for each employee
      for (const emp of dept.employees) {
        // Generate random but realistic hourly production
        const targetPerHour = card.targetPerHour;
        const hours = Array.from({ length: 8 }, () => {
          // Random variation: 80-120% of target
          const variation = 0.8 + Math.random() * 0.4;
          return Math.floor(targetPerHour * variation);
        });

        const totalProduced = hours.reduce((sum, h) => sum + h, 0);
        const targetForDay = targetPerHour * 8;
        const diff = totalProduced - targetForDay;
        const plusPieces = Math.max(0, diff);
        const minusPieces = Math.max(0, -diff);

        await db.hourlyCountLine.upsert({
          where: { sheetId_employeeId: { sheetId: sheet.id, employeeId: emp.id } },
          update: {
            h1: hours[0],
            h2: hours[1],
            h3: hours[2],
            h4: hours[3],
            h5: hours[4],
            h6: hours[5],
            h7: hours[6],
            h8: hours[7],
            totalProduced,
            targetForDay,
            plusPieces,
            minusPieces,
            mistakes: Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0, // 20% chance of mistakes
            status: "SUBMITTED",
          },
          create: {
            sheetId: sheet.id,
            employeeId: emp.id,
            departmentId: dept.id,
            h1: hours[0],
            h2: hours[1],
            h3: hours[2],
            h4: hours[3],
            h5: hours[4],
            h6: hours[5],
            h7: hours[6],
            h8: hours[7],
            totalProduced,
            targetForDay,
            plusPieces,
            minusPieces,
            mistakes: Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0,
            status: "SUBMITTED",
            enteredById: sheet.supervisorId,
          },
        });

        totalCreated++;
      }
      
      console.log(`  ✅ ${dept.nameAm}: ${dept.employees.length} employees`);
    }
  }

  console.log(`\n✅ Created/updated ${totalCreated} hourly count records across ${dates.length} dates`);

  // Check if incentive data is being calculated
  console.log("\n📊 Checking incentive calculation for today...");
  
  const allLines = await db.hourlyCountLine.findMany({
    where: {
      sheet: { date: today },
    },
    include: {
      employee: true,
      department: true,
    },
  });

  console.log(`\n📈 Total lines for today: ${allLines.length}`);
  
  if (allLines.length > 0) {
    const totalPlus = allLines.reduce((sum, line) => sum + line.plusPieces, 0);
    const totalMinus = allLines.reduce((sum, line) => sum + line.minusPieces, 0);
    const totalMistakes = allLines.reduce((sum, line) => sum + line.mistakes, 0);
    
    console.log(`  • Total +pieces: ${totalPlus}`);
    console.log(`  • Total -pieces: ${totalMinus}`);
    console.log(`  • Total mistakes: ${totalMistakes}`);
    console.log(`  • Net pieces (for incentive): ${totalPlus - totalMinus - (2 * totalMistakes)}`);
  }

  console.log("\n✅ Done! You can now navigate between dates at http://localhost:3000/counts/enter\n");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
