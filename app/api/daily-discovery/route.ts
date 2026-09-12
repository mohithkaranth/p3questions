import { NextResponse } from "next/server";
import { getDailyDiscovery } from "@/lib/daily-discovery";
import { getSingaporeDate } from "@/lib/singapore-date";
import { apiError, logServerError, withDeadline } from "@/lib/server-errors";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET() {
  try { const date = getSingaporeDate(); return NextResponse.json({ date, ...(await withDeadline(getDailyDiscovery(date))) }); }
  catch (error) { logServerError("Daily discovery failed", error); return apiError("DISCOVERY_UNAVAILABLE", 503); }
}
