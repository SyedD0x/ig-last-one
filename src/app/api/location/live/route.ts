import { NextResponse } from "next/server";
import { db } from "@/db";
import { busLocations } from "@/db/schema";
import { sql, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get the latest location for each bus within the last 60 seconds
    const liveLocations = await db.execute(sql`
      SELECT DISTINCT ON (bus_id)
        id, bus_id, bus_name, latitude, longitude, speed, heading, timestamp, is_active
      FROM bus_locations
      WHERE timestamp > NOW() - INTERVAL '60 seconds'
      ORDER BY bus_id, timestamp DESC
    `);

    return NextResponse.json({ locations: liveLocations.rows });
  } catch (error) {
    console.error("Live location error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
