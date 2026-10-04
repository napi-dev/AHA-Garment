import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In v2, bundle tags are deprecated as items are tracked by order number and flow handovers
export async function GET() {
  return NextResponse.json({ error: "Bundle tags are deprecated in v2" }, { status: 410 });
}
