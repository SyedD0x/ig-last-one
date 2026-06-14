import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { busLocations } from "@/db/schema";
import { and, eq, gte, lte, asc, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const busId = searchParams.get("busId");
    const date = searchParams.get("date"); // YYYY-MM-DD

    if (!busId || !date) {
      return NextResponse.json({ error: "busId and date are required" }, { status: 400 });
    }

    const startDate = new Date(`${date}T00:00:00.000Z`);
    const endDate = new Date(`${date}T23:59:59.999Z`);

    const history = await db
      .select()
      .from(busLocations)
      .where(
        and(
          eq(busLocations.busId, busId),
          gte(busLocations.timestamp, startDate),
          lte(busLocations.timestamp, endDate)
        )
      )
      .orderBy(asc(busLocations.timestamp));

    return NextResponse.json({ history });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
