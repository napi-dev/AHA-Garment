/**
 * Incentive engine — pure functions only.
 * No database calls, no side effects.
 *
 * Formula (master plan §5.4):
 *   Calculated = (plusPieces − minusPieces − 2 × mistakes) × ratePerPiece
 *   Payable     = max(0, Calculated)   — or 0 if suspended
 *
 * Money is handled with Decimal.js to prevent floating-point drift.
 * Every monetary value is rounded to 2 decimal places before summing,
 * exactly as in the sample (line totals are the sum of printed lines).
 *
 * Acceptance tests at the bottom (vitest inline) must pass:
 *   Period 1 calculated: 3,880.50 ETB   payable: 4,243.50 ETB
 *   Period 2 calculated: 3,765.00 ETB   payable: 4,009.00 ETB
 *   Month    calculated: 7,645.50 ETB   payable: 8,252.50 ETB
 */

import Decimal from "decimal.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkerPeriodInput {
  employeeId: string;
  departmentId: string;
  plusPieces: number;    // pieces above target accumulated over period
  minusPieces: number;   // pieces below target accumulated over period
  mistakes: number;      // wrongly-reported count entries
  ratePerPiece: string;  // ETB, exact string → Decimal (e.g. "1.00", "0.90")
  isSuspended: boolean;  // second-offence suspension in effect?
}

export interface WorkerPeriodResult {
  employeeId: string;
  departmentId: string;
  plusPieces: number;
  minusPieces: number;
  mistakes: number;
  ratePerPiece: string;
  calculated: string;  // ETB, 2dp, can be negative
  payable: string;     // ETB, 2dp, never negative, 0 if suspended
  isSuspended: boolean;
}

export interface PeriodTotals {
  totalCalculated: string;  // sum of all calculated (may include negatives)
  totalPayable: string;     // sum of all payable (negatives floored at 0)
}

// ─── Core calculation ─────────────────────────────────────────────────────────

/**
 * Calculate incentive for a single worker in a single period.
 */
export function calculateWorkerIncentive(input: WorkerPeriodInput): WorkerPeriodResult {
  const rate = new Decimal(input.ratePerPiece);

  // calculated = (plus - minus - 2*mistakes) * rate
  const net = new Decimal(input.plusPieces)
    .minus(input.minusPieces)
    .minus(new Decimal(input.mistakes).times(2));

  const calculated = net.times(rate).toDecimalPlaces(2);

  // payable = max(0, calculated), but 0 if suspended
  let payable: Decimal;
  if (input.isSuspended) {
    payable = new Decimal(0);
  } else {
    payable = Decimal.max(0, calculated);
  }

  return {
    employeeId: input.employeeId,
    departmentId: input.departmentId,
    plusPieces: input.plusPieces,
    minusPieces: input.minusPieces,
    mistakes: input.mistakes,
    ratePerPiece: input.ratePerPiece,
    calculated: calculated.toFixed(2),
    payable: payable.toFixed(2),
    isSuspended: input.isSuspended,
  };
}

/**
 * Calculate incentive for all workers in a period and sum the totals.
 * Totals are the sum of the printed (2dp) lines — not re-rounded.
 */
export function calculatePeriodTotals(inputs: WorkerPeriodInput[]): {
  lines: WorkerPeriodResult[];
  totals: PeriodTotals;
} {
  const lines = inputs.map(calculateWorkerIncentive);

  let totalCalculated = new Decimal(0);
  let totalPayable = new Decimal(0);

  for (const line of lines) {
    totalCalculated = totalCalculated.plus(new Decimal(line.calculated));
    totalPayable = totalPayable.plus(new Decimal(line.payable));
  }

  return {
    lines,
    totals: {
      totalCalculated: totalCalculated.toFixed(2),
      totalPayable: totalPayable.toFixed(2),
    },
  };
}

/**
 * Calculate the month summary — two periods combined.
 * Month totals are the sum of the two period totals (sum of printed lines).
 */
export function calculateMonthSummary(
  period1Lines: WorkerPeriodResult[],
  period2Lines: WorkerPeriodResult[]
): {
  monthCalculated: string;
  monthPayable: string;
  departmentTotals: DeptMonthTotal[];
} {
  // Build map: employeeId → period1 result
  const p1Map = new Map(period1Lines.map((l) => [l.employeeId, l]));
  const p2Map = new Map(period2Lines.map((l) => [l.employeeId, l]));

  // All unique employees
  const allIds = new Set([
    ...period1Lines.map((l) => l.employeeId),
    ...period2Lines.map((l) => l.employeeId),
  ]);

  // Dept-level accumulators
  const deptMap = new Map<
    string,
    { p1Calc: Decimal; p2Calc: Decimal; p1Pay: Decimal; p2Pay: Decimal }
  >();

  let monthCalculated = new Decimal(0);
  let monthPayable = new Decimal(0);

  for (const id of allIds) {
    const p1 = p1Map.get(id);
    const p2 = p2Map.get(id);
    const deptId = (p1 ?? p2)!.departmentId;

    if (!deptMap.has(deptId)) {
      deptMap.set(deptId, {
        p1Calc: new Decimal(0),
        p2Calc: new Decimal(0),
        p1Pay: new Decimal(0),
        p2Pay: new Decimal(0),
      });
    }
    const d = deptMap.get(deptId)!;

    if (p1) {
      d.p1Calc = d.p1Calc.plus(new Decimal(p1.calculated));
      d.p1Pay = d.p1Pay.plus(new Decimal(p1.payable));
      monthCalculated = monthCalculated.plus(new Decimal(p1.calculated));
      monthPayable = monthPayable.plus(new Decimal(p1.payable));
    }
    if (p2) {
      d.p2Calc = d.p2Calc.plus(new Decimal(p2.calculated));
      d.p2Pay = d.p2Pay.plus(new Decimal(p2.payable));
      monthCalculated = monthCalculated.plus(new Decimal(p2.calculated));
      monthPayable = monthPayable.plus(new Decimal(p2.payable));
    }
  }

  const departmentTotals: DeptMonthTotal[] = [];
  for (const [deptId, d] of deptMap.entries()) {
    const monthCalc = d.p1Calc.plus(d.p2Calc);
    const monthPay = d.p1Pay.plus(d.p2Pay);
    departmentTotals.push({
      departmentId: deptId,
      period1Calculated: d.p1Calc.toFixed(2),
      period2Calculated: d.p2Calc.toFixed(2),
      monthCalculated: monthCalc.toFixed(2),
      monthPayable: monthPay.toFixed(2),
    });
  }

  return {
    monthCalculated: monthCalculated.toFixed(2),
    monthPayable: monthPayable.toFixed(2),
    departmentTotals,
  };
}

export interface DeptMonthTotal {
  departmentId: string;
  period1Calculated: string;
  period2Calculated: string;
  monthCalculated: string;
  monthPayable: string;
}

// ─── Daily count helpers ──────────────────────────────────────────────────────

/**
 * Calculate a worker's daily result from hourly counts and their target.
 * Used on the daily production sheet.
 */
export interface DailyCountInput {
  hourlyTarget: number;   // from incentive card
  hoursWorked: number;    // from attendance (default 8)
  // Actual pieces per hour (null = worker not present that hour)
  h1?: number | null; h2?: number | null; h3?: number | null; h4?: number | null;
  h5?: number | null; h6?: number | null; h7?: number | null; h8?: number | null;
}

export interface DailyCountResult {
  totalProduced: number;
  targetForDay: number;       // hourlyTarget × hoursWorked
  dailyDifference: number;    // totalProduced − targetForDay (signed)
  plusPieces: number;         // max(0, difference)
  minusPieces: number;        // max(0, −difference)
  percentOfTarget: number;    // totalProduced / targetForDay × 100 (0 if target=0)
}

export function calculateDailyCount(input: DailyCountInput): DailyCountResult {
  const hours = [input.h1, input.h2, input.h3, input.h4, input.h5, input.h6, input.h7, input.h8];
  const totalProduced = hours.reduce((sum, h) => sum + (h ?? 0), 0);
  const targetForDay = input.hourlyTarget * input.hoursWorked;
  const dailyDifference = totalProduced - targetForDay;
  const plusPieces = Math.max(0, dailyDifference);
  const minusPieces = Math.max(0, -dailyDifference);
  const percentOfTarget = targetForDay > 0
    ? Math.round((totalProduced / targetForDay) * 100 * 10) / 10
    : 0;

  return { totalProduced, targetForDay, dailyDifference, plusPieces, minusPieces, percentOfTarget };
}

// ─── Wastage calculation ──────────────────────────────────────────────────────

/**
 * Calculate fabric wastage for a cut job.
 * Formula: (weightUsed - piecesCut × standardWeightPerPiece) / weightUsed × 100
 */
export function calculateWastage(
  weightUsed: number,
  piecesCut: number,
  standardWeightPerPiece: number
): { wastagePct: number; alertRequired: boolean; limitPct: number } {
  const limitPct = 5.0;
  if (weightUsed <= 0) return { wastagePct: 0, alertRequired: false, limitPct };
  const standardWeight = piecesCut * standardWeightPerPiece;
  const waste = weightUsed - standardWeight;
  const wastagePct = (waste / weightUsed) * 100;
  return {
    wastagePct: Math.round(wastagePct * 100) / 100,
    alertRequired: wastagePct > limitPct,
    limitPct,
  };
}

// ─── Acceptance tests (inline vitest) ────────────────────────────────────────

if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest;

  // ── Sample data from appendix B (master plan) ──────────────────────────

  // All 24 department rows from the monthly incentive summary table.
  // deptId is just a label here — matches the dept name for clarity.
  // We only need period1 and period2 calculated values to verify totals.

  const APPENDIX_DEPTS: Array<{
    deptId: string;
    workers: number;
    p1Calc: number;
    p2Calc: number;
  }> = [
    { deptId: "d01", workers: 4,  p1Calc: 560.00,  p2Calc: 135.00  },
    { deptId: "d02", workers: 1,  p1Calc: 150.00,  p2Calc: 180.00  },
    { deptId: "d03", workers: 4,  p1Calc: 350.00,  p2Calc: 350.00  },
    { deptId: "d04", workers: 4,  p1Calc: 85.50,   p2Calc: 423.00  },
    { deptId: "d05", workers: 4,  p1Calc: 270.00,  p2Calc: 380.00  },
    { deptId: "d06", workers: 4,  p1Calc: 320.00,  p2Calc: -70.00  },
    { deptId: "d07", workers: 2,  p1Calc: 189.00,  p2Calc: 40.50   },
    { deptId: "d08", workers: 4,  p1Calc: 264.00,  p2Calc: 408.00  },
    { deptId: "d09", workers: 4,  p1Calc: 144.00,  p2Calc: 189.00  },
    { deptId: "d10", workers: 3,  p1Calc: 344.00,  p2Calc: 120.00  },
    { deptId: "d11", workers: 2,  p1Calc: 0.00,    p2Calc: 0.00    },
    { deptId: "d12", workers: 4,  p1Calc: 156.00,  p2Calc: 200.00  },
    { deptId: "d13", workers: 4,  p1Calc: 392.00,  p2Calc: 408.00  },
    { deptId: "d14", workers: 8,  p1Calc: 329.00,  p2Calc: 542.50  },
    { deptId: "d15", workers: 5,  p1Calc: 297.00,  p2Calc: 177.00  },
    { deptId: "d16", workers: 1,  p1Calc: -24.00,  p2Calc: 72.00   },
    { deptId: "d17", workers: 2,  p1Calc: -32.00,  p2Calc: -24.00  },
    { deptId: "d18", workers: 1,  p1Calc: -40.00,  p2Calc: 0.00    },
    { deptId: "d19", workers: 1,  p1Calc: 81.00,   p2Calc: 180.00  },
    { deptId: "d20", workers: 1,  p1Calc: 45.00,   p2Calc: 54.00   },
    { deptId: "d21", workers: 1,  p1Calc: 0.00,    p2Calc: 0.00    },
    { deptId: "d22", workers: 1,  p1Calc: 0.00,    p2Calc: 0.00    },
    { deptId: "d23", workers: 1,  p1Calc: 0.00,    p2Calc: 0.00    },
    { deptId: "d24", workers: 1,  p1Calc: 0.00,    p2Calc: 0.00    },
  ];

  // Build synthetic inputs that reproduce the appendix totals.
  // Each dept is represented as a single worker whose net equals the dept total.
  // This is the simplest way to test the formula from the appendix numbers.

  // Rates by dept index (from incentive card appendix A):
  const RATES = [
    "1.00","1.00","1.00","0.90","1.00","1.00","0.90","1.20","0.90","0.80",
    "0.00","0.80","0.80","0.70","0.60","0.80","0.80","0.80","0.90","0.90",
    "0.60","0.60","0.00","0.00",
  ];

  // Reconstruct plus/minus from calculated and rate for each dept aggregate
  function makeSyntheticInput(
    deptId: string,
    deptIndex: number,
    calcAmount: number
  ): WorkerPeriodInput {
    const rate = new Decimal(RATES[deptIndex] ?? "0.00");
    let plusPieces = 0;
    let minusPieces = 0;
    if (rate.gt(0) && calcAmount !== 0) {
      const net = new Decimal(calcAmount).dividedBy(rate);
      if (net.gte(0)) {
        plusPieces = net.toNumber();
      } else {
        minusPieces = net.abs().toNumber();
      }
    }
    return {
      employeeId: deptId,
      departmentId: deptId,
      plusPieces,
      minusPieces,
      mistakes: 0,
      ratePerPiece: RATES[deptIndex] ?? "0.00",
      isSuspended: false,
    };
  }

  describe("Incentive engine — appendix acceptance tests", () => {

    it("period 1 calculated total = 3,880.50 ETB", () => {
      const inputs = APPENDIX_DEPTS.map((d, i) =>
        makeSyntheticInput(d.deptId, i, d.p1Calc)
      );
      const { totals } = calculatePeriodTotals(inputs);
      expect(totals.totalCalculated).toBe("3880.50");
    });

    it("period 1 payable total = 4,243.50 ETB (negatives floored at 0)", () => {
      const inputs = APPENDIX_DEPTS.map((d, i) =>
        makeSyntheticInput(d.deptId, i, d.p1Calc)
      );
      const { totals } = calculatePeriodTotals(inputs);
      expect(totals.totalPayable).toBe("4243.50");
    });

    it("period 2 calculated total = 3,765.00 ETB", () => {
      const inputs = APPENDIX_DEPTS.map((d, i) =>
        makeSyntheticInput(d.deptId, i, d.p2Calc)
      );
      const { totals } = calculatePeriodTotals(inputs);
      expect(totals.totalCalculated).toBe("3765.00");
    });

    it("period 2 payable total = 4,009.00 ETB", () => {
      const inputs = APPENDIX_DEPTS.map((d, i) =>
        makeSyntheticInput(d.deptId, i, d.p2Calc)
      );
      const { totals } = calculatePeriodTotals(inputs);
      expect(totals.totalPayable).toBe("4009.00");
    });

    it("month calculated total = 7,645.50 ETB", () => {
      const p1 = APPENDIX_DEPTS.map((d, i) =>
        calculateWorkerIncentive(makeSyntheticInput(d.deptId, i, d.p1Calc))
      );
      const p2 = APPENDIX_DEPTS.map((d, i) =>
        calculateWorkerIncentive(makeSyntheticInput(d.deptId, i, d.p2Calc))
      );
      const { monthCalculated } = calculateMonthSummary(p1, p2);
      expect(monthCalculated).toBe("7645.50");
    });

    it("month payable total = 8,252.50 ETB", () => {
      const p1 = APPENDIX_DEPTS.map((d, i) =>
        calculateWorkerIncentive(makeSyntheticInput(d.deptId, i, d.p1Calc))
      );
      const p2 = APPENDIX_DEPTS.map((d, i) =>
        calculateWorkerIncentive(makeSyntheticInput(d.deptId, i, d.p2Calc))
      );
      const { monthPayable } = calculateMonthSummary(p1, p2);
      expect(monthPayable).toBe("8252.50");
    });

    it("worked line: Senait Teferi — (200-0-0)×1.00 = 200.00 payable 200.00", () => {
      const r = calculateWorkerIncentive({
        employeeId: "e1", departmentId: "d1",
        plusPieces: 200, minusPieces: 0, mistakes: 0,
        ratePerPiece: "1.00", isSuspended: false,
      });
      expect(r.calculated).toBe("200.00");
      expect(r.payable).toBe("200.00");
    });

    it("worked line: Sewnet Kabhun — (100-0-0)×1.20 = 120.00", () => {
      const r = calculateWorkerIncentive({
        employeeId: "e2", departmentId: "d2",
        plusPieces: 100, minusPieces: 0, mistakes: 0,
        ratePerPiece: "1.20", isSuspended: false,
      });
      expect(r.calculated).toBe("120.00");
      expect(r.payable).toBe("120.00");
    });

    it("worked line: Shewaye — (0-30-0)×0.90 = -27.00 → payable 0.00", () => {
      const r = calculateWorkerIncentive({
        employeeId: "e3", departmentId: "d3",
        plusPieces: 0, minusPieces: 30, mistakes: 0,
        ratePerPiece: "0.90", isSuspended: false,
      });
      expect(r.calculated).toBe("-27.00");
      expect(r.payable).toBe("0.00");
    });

    it("mistakes example: (200-20-10)×0.90 = 153.00", () => {
      const r = calculateWorkerIncentive({
        employeeId: "e4", departmentId: "d4",
        plusPieces: 200, minusPieces: 20, mistakes: 5,
        ratePerPiece: "0.90", isSuspended: false,
      });
      expect(r.calculated).toBe("153.00");
      expect(r.payable).toBe("153.00");
    });

    it("suspended worker: payable is 0.00 regardless of positive calculated", () => {
      const r = calculateWorkerIncentive({
        employeeId: "e5", departmentId: "d5",
        plusPieces: 500, minusPieces: 0, mistakes: 0,
        ratePerPiece: "1.00", isSuspended: true,
      });
      expect(r.calculated).toBe("500.00");
      expect(r.payable).toBe("0.00");
    });
  });

  describe("Daily count calculation", () => {
    it("525 produced, target 520 (65/hr × 8hr) → +5, 100.9%", () => {
      const r = calculateDailyCount({
        hourlyTarget: 65, hoursWorked: 8,
        h1: 60, h2: 65, h3: 68, h4: 66, h5: 65, h6: 67, h7: 67, h8: 67,
      });
      expect(r.totalProduced).toBe(525);
      expect(r.targetForDay).toBe(520);
      expect(r.plusPieces).toBe(5);
      expect(r.minusPieces).toBe(0);
    });

    it("part shift 5 hrs: target = 82×5 = 410", () => {
      const r = calculateDailyCount({ hourlyTarget: 82, hoursWorked: 5,
        h1: 80, h2: 85, h3: 90, h4: 80, h5: 85 });
      expect(r.targetForDay).toBe(410);
      expect(r.totalProduced).toBe(420);
      expect(r.plusPieces).toBe(10);
    });

    it("absent worker: target = 82×0 = 0, no negative produced", () => {
      const r = calculateDailyCount({ hourlyTarget: 82, hoursWorked: 0 });
      expect(r.targetForDay).toBe(0);
      expect(r.minusPieces).toBe(0);
    });
  });

  describe("Wastage calculation", () => {
    it("example: 100kg, 0.25kg/piece, 376 pieces → 6.0% → alert", () => {
      const r = calculateWastage(100, 376, 0.25);
      expect(r.wastagePct).toBe(6.0);
      expect(r.alertRequired).toBe(true);
    });

    it("exactly 5%: no alert", () => {
      // 5% waste: standardWeight = weightUsed * 0.95
      // weightUsed=100, pcs=380, stdPerPiece=0.25 → std=95, waste=5, pct=5.0
      const r = calculateWastage(100, 380, 0.25);
      expect(r.wastagePct).toBe(5.0);
      expect(r.alertRequired).toBe(false);
    });
  });
}
