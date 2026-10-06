/**
 * Cron endpoint for checking alerts
 * Should be called hourly by an external cron service (e.g., Vercel Cron, cron-job.org)
 * 
 * Checks:
 * - 72/48/24 hour order countdown alerts
 * - Delayed orders
 * - Missing day close (run once per day at 8 PM)
 */

import { NextRequest, NextResponse } from "next/server";
import { checkOrderCountdown, checkDelayedOrders, checkMissingDayClose } from "@/lib/automation/alerts";

export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication via secret header
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;
    
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Run countdown checks (72/48/24 hours)
    await checkOrderCountdown();
    
    // Check for delayed orders
    await checkDelayedOrders();
    
    // Check if today's day should be closed (only run once per day at 8 PM)
    const currentHour = new Date().getHours();
    if (currentHour === 20) {
      await checkMissingDayClose();
    }

    return NextResponse.json({
      success: true,
      message: "Alert checks completed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron alert check failed:", error);
    return NextResponse.json(
      { 
        error: "Alert check failed",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
