/**
 * Seed 5 days of hourly count and attendance data
 * Run AFTER the main seed: npm run db:seed-data
 * 
 * This creates realistic production data for testing:
 * - Hourly counts for all production workers (90-110% of target)
 * - Attendance records (95% present, 5% various absences)
 * - Locked boxes and attendance submissions
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

async function main() {
  console.log("🌱 Seeding 5 days of incentive data...\n");

  // Get all employees with jobs that have targets
  const employees = await db.employee.findMany({
    where: { 
      isActive: true,
      job: {
        incentiveCards: {
          some: {
            targetPerHour: { gt: 0 },
          },
        },
      },
    },
    include: {
      job: {
        include: {
          incentiveCards: {
            where: {
              effectiveFrom: { lte: new Date() },
              OR: [
                { effectiveTo: null },
                { effectiveTo: { gte: new Date() } },
              ],
            },
            orderBy: { effectiveFrom: "desc" },
            take: 1,
          },
          department: true,
        },
      },
    },
  });

  console.log(`  Found ${employees.length} production workers with targets`);

  // Generate dates for last 5 days
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  const dates: Date[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d);
  }

  console.log(`  Generating data for dates:`);
  dates.forEach(d => console.log(`    - ${d.toISOString().split('T')[0]}`));

  let boxCount = 0;
  let attendanceCount = 0;

  // Get all employees for attendance (including support staff)
  const allEmployees = await db.employee.findMany({
    where: { isActive: true },
  });

  for (const date of dates) {
    console.log(`\n  Processing ${date.toISOString().split('T')[0]}...`);

    // Create hourly boxes for production workers
    for (const emp of employees) {
      if (!emp.job) continue;
      
      const card = emp.job.incentiveCards[0];
      if (!card || card.targetPerHour === 0) continue;

      const baseTarget = card.targetPerHour;
      const hoursWorked = 8;

      // Generate hourly counts with realistic variation
      // Better workers consistently hit 100-110%, average workers 85-100%
      const performanceLevel = 0.85 + Math.random() * 0.25; // 85% to 110%
      
      const hourlyCounts: number[] = [];
      for (let h = 0; h < hoursWorked; h++) {
        // Add some hourly variation (±10%)
        const hourlyVariation = 0.9 + Math.random() * 0.2;
        const count = Math.floor(baseTarget * performanceLevel * hourlyVariation);
        hourlyCounts.push(count);
      }

      const totalProduced = hourlyCounts.reduce((sum, c) => sum + c, 0);
      const targetForDay = baseTarget * hoursWorked;
      const plusPieces = Math.max(0, totalProduced - targetForDay);
      const minusPieces = Math.max(0, targetForDay - totalProduced);

      // Random mistakes (0-3, weighted toward 0-1)
      const mistakeRoll = Math.random();
      const mistakes = mistakeRoll < 0.7 ? 0 : mistakeRoll < 0.9 ? 1 : mistakeRoll < 0.97 ? 2 : 3;

      try {
        await db.hourlyBox.create({
          data: {
            date,
            employeeId: emp.id,
            jobId: emp.job.id,
            departmentId: emp.job.department.id,
            h1: hourlyCounts[0],
            h2: hourlyCounts[1],
            h3: hourlyCounts[2],
            h4: hourlyCounts[3],
            h5: hourlyCounts[4],
            h6: hourlyCounts[5],
            h7: hourlyCounts[6],
            h8: hourlyCounts[7],
            totalProduced,
            targetForDay,
            plusPieces,
            minusPieces,
            mistakes,
            mistakeReason: mistakes > 0 ? "የስራ ስህተት" : null,
            supervisorId: "seed-data",
            isLocked: true,
          },
        });
        boxCount++;
      } catch (e) {
        // Skip if already exists
        console.log(`    ⚠ Skipping duplicate box for employee ${emp.serialNumber}`);
      }
    }

    // Create attendance for ALL employees (including support staff)
    for (const emp of allEmployees) {
      // 95% present, 5% various absences
      const rand = Math.random();
      let status: "PRESENT" | "ABSENT_UNAUTHORIZED" | "ABSENT_AUTHORIZED" | "SICK_LEAVE";

      if (rand < 0.95) {
        status = "PRESENT";
      } else if (rand < 0.97) {
        status = "ABSENT_AUTHORIZED"; // ፈቃድ
      } else if (rand < 0.99) {
        status = "SICK_LEAVE"; // የሃኪም ማስረጃ
      } else {
        status = "ABSENT_UNAUTHORIZED"; // ቀሪ
      }

      try {
        await db.attendance.create({
          data: {
            employeeId: emp.id,
            date,
            status,
            enteredById: "seed-data",
            lockedAt: new Date(),
          },
        });
        attendanceCount++;
      } catch (e) {
        // Skip if already exists
      }
    }

    // Create attendance submission for this date
    try {
      await db.attendanceSubmission.create({
        data: {
          date,
          supervisorId: "seed-data",
          submittedAt: new Date(date.getTime() + 17 * 60 * 60 * 1000), // 5 PM same day
        },
      });
    } catch (e) {
      // Skip if already exists
    }

    console.log(`    ✓ ${boxCount} boxes, ${attendanceCount} attendance records`);
  }

  console.log("\n✅ Incentive data seed complete!");
  console.log(`\n📊 Summary:`);
  console.log(`   • ${dates.length} days of data created`);
  console.log(`   • ${boxCount} hourly count boxes`);
  console.log(`   • ${attendanceCount} attendance records`);
  console.log(`   • ${allEmployees.length} total employees`);
  console.log(`   • ${employees.length} production workers with targets`);
  console.log(`\n💡 You can now:`);
  console.log(`   • View production counts in /counts/enter`);
  console.log(`   • Check attendance in /attendance`);
  console.log(`   • See dashboard graphs with real data`);
  console.log(`   • Test incentive calculations`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
