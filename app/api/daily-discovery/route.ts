import { NextResponse } from "next/server";
import { getDailyDiscovery } from "@/lib/daily-discovery";
import { getSingaporeDate } from "@/lib/singapore-date";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET() {
  try { const date = getSingaporeDate(); return NextResponse.json({ date, ...(await getDailyDiscovery(date)) }); }
  catch (error) { console.error("Daily discovery failed", error); return NextResponse.json({ error: "Today's surprise is still getting ready." }, { status: 503 }); }
}
