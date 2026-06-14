import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { busLocations, buses } from "@/db/schema";
import { eq } from "drizzle-orm";

// Simulated bus routes - circular routes around a city
const busRoutes: Record<string, Array<[number, number]>> = {
  bus1: [
    [40.7128, -74.0060],
    [40.7148, -74.0040],
    [40.7168, -74.0020],
    [40.7188, -73.9990],
    [40.7200, -73.9960],
    [40.7190, -73.9930],
    [40.7170, -73.9920],
    [40.7150, -73.9940],
    [40.7130, -73.9960],
    [40.7110, -73.9980],
    [40.7100, -74.0010],
    [40.7108, -74.0040],
  ],
  bus2: [
    [40.7050, -74.0100],
    [40.7070, -74.0080],
    [40.7090, -74.0060],
    [40.7110, -74.0040],
    [40.7130, -74.0020],
    [40.7140, -73.9990],
    [40.7130, -73.9960],
    [40.7110, -73.9950],
    [40.7090, -73.9970],
    [40.7070, -73.9990],
    [40.7060, -74.0020],
    [40.7050, -74.0060],
  ],
  school_a: [
    [40.7200, -74.0150],
    [40.7180, -74.0120],
    [40.7160, -74.0090],
    [40.7140, -74.0060],
    [40.7120, -74.0030],
    [40.7110, -74.0000],
    [40.7120, -73.9970],
    [40.7140, -73.9960],
    [40.7160, -73.9980],
    [40.7180, -74.0010],
    [40.7200, -74.0040],
    [40.7210, -74.0090],
  ],
};

// State stored in memory (resets on redeploy - that's fine for simulation)
const busState: Record<string, { index: number; lastUpdate: number }> = {};

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    if (secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = [];

    for (const [busId, route] of Object.entries(busRoutes)) {
      if (!busState[busId]) {
        busState[busId] = { index: 0, lastUpdate: 0 };
      }

      const state = busState[busId];
      const currentPos = route[state.index];
      const nextIndex = (state.index + 1) % route.length;
      const nextPos = route[nextIndex];

      // Calculate speed (distance between points / time)
      const R = 6371000;
      const lat1 = currentPos[0] * Math.PI / 180;
      const lat2 = nextPos[0] * Math.PI / 180;
      const dLat = (nextPos[0] - currentPos[0]) * Math.PI / 180;
      const dLon = (nextPos[1] - currentPos[1]) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const speed = Math.round(20 + Math.random() * 30); // 20-50 km/h

      // Get bus name
      const [bus] = await db.select().from(buses).where(eq(buses.busId, busId)).limit(1);
      const busName = bus?.busName || busId;

      await db.insert(busLocations).values({
        busId,
        busName,
        latitude: currentPos[0],
        longitude: currentPos[1],
        speed,
        heading: Math.atan2(nextPos[1] - currentPos[1], nextPos[0] - currentPos[0]) * 180 / Math.PI,
        isActive: true,
      });

      state.index = nextIndex;
      results.push({ busId, lat: currentPos[0], lng: currentPos[1], speed });
    }

    return NextResponse.json({ success: true, updated: results });
  } catch (error) {
    console.error("Simulate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
