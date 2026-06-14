import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { busLocations } from "@/db/schema";
import { and, gte, lte, eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const busId = searchParams.get("busId");
    const date = searchParams.get("date");

    let query = db.select().from(busLocations).$dynamic();

    if (busId) {
      query = query.where(eq(busLocations.busId, busId));
    }

    if (date) {
      const startDate = new Date(`${date}T00:00:00.000Z`);
      const endDate = new Date(`${date}T23:59:59.999Z`);
      query = query.where(
        and(
          gte(busLocations.timestamp, startDate),
          lte(busLocations.timestamp, endDate)
        )
      );
    }

    const history = await query.orderBy(desc(busLocations.timestamp)).limit(500);
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Admin bus history error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
