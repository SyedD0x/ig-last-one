import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromLat = searchParams.get("fromLat");
    const fromLng = searchParams.get("fromLng");
    const toLat = searchParams.get("toLat");
    const toLng = searchParams.get("toLng");

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return NextResponse.json({ error: "fromLat, fromLng, toLat, toLng required" }, { status: 400 });
    }

    const apiKey = process.env.GRAPHHOPPER_API_KEY;

    // Use GraphHopper API
    const ghUrl = `https://graphhopper.com/api/1/route?point=${fromLat},${fromLng}&point=${toLat},${toLng}&vehicle=car&locale=en&key=${apiKey}&type=json&points_encoded=false`;

    const response = await fetch(ghUrl, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      // Fallback: calculate straight-line distance
      const R = 6371000; // Earth radius in meters
      const lat1 = parseFloat(fromLat) * Math.PI / 180;
      const lat2 = parseFloat(toLat) * Math.PI / 180;
      const dLat = (parseFloat(toLat) - parseFloat(fromLat)) * Math.PI / 180;
      const dLon = (parseFloat(toLng) - parseFloat(fromLng)) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      const etaMinutes = Math.round(distance / (30 * 1000 / 60)); // assume 30 km/h

      return NextResponse.json({
        distance: Math.round(distance),
        duration: etaMinutes * 60,
        eta: etaMinutes,
        points: [[parseFloat(fromLng), parseFloat(fromLat)], [parseFloat(toLng), parseFloat(toLat)]],
        fallback: true,
      });
    }

    const data = await response.json();
    const path = data.paths?.[0];

    if (!path) {
      return NextResponse.json({ error: "No route found" }, { status: 404 });
    }

    return NextResponse.json({
      distance: Math.round(path.distance),
      duration: Math.round(path.time / 1000),
      eta: Math.round(path.time / 60000),
      points: path.points?.coordinates || [],
      fallback: false,
    });
  } catch (error) {
    console.error("Route info error:", error);

    // Last resort fallback
    const { searchParams } = new URL(req.url);
    const fromLat = parseFloat(searchParams.get("fromLat") || "0");
    const fromLng = parseFloat(searchParams.get("fromLng") || "0");
    const toLat = parseFloat(searchParams.get("toLat") || "0");
    const toLng = parseFloat(searchParams.get("toLng") || "0");

    const R = 6371000;
    const lat1 = fromLat * Math.PI / 180;
    const lat2 = toLat * Math.PI / 180;
    const dLat = (toLat - fromLat) * Math.PI / 180;
    const dLon = (toLng - fromLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return NextResponse.json({
      distance: Math.round(distance),
      duration: Math.round(distance / (30 * 1000 / 60) * 60),
      eta: Math.round(distance / (30 * 1000 / 60)),
      points: [[fromLng, fromLat], [toLng, toLat]],
      fallback: true,
    });
  }
}
