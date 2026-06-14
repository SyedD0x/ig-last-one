import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { busLocations, buses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { busId, latitude, longitude, speed, heading } = body;

    if (!busId || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "busId, latitude, longitude required" }, { status: 400 });
    }

    // Get bus name
    const [bus] = await db
      .select()
      .from(buses)
      .where(eq(buses.busId, busId))
      .limit(1);

    const busName = bus?.busName || busId;

    // Insert location record
    await db.insert(busLocations).values({
      busId,
      busName,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      speed: parseFloat(speed || "0"),
      heading: parseFloat(heading || "0"),
      isActive: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Location update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
