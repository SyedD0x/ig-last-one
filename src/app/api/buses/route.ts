import { NextResponse } from "next/server";
import { db } from "@/db";
import { buses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const allBuses = await db
      .select()
      .from(buses)
      .where(eq(buses.isActive, true));

    return NextResponse.json({ buses: allBuses });
  } catch (error) {
    console.error("Get buses error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { busId, busName, driverName } = body;

    if (!busId || !busName) {
      return NextResponse.json({ error: "Bus ID and name are required" }, { status: 400 });
    }

    const [newBus] = await db
      .insert(buses)
      .values({ busId, busName, driverName })
      .returning();

    return NextResponse.json({ bus: newBus }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("unique")) {
      return NextResponse.json({ error: "Bus ID already exists" }, { status: 409 });
    }
    console.error("Create bus error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
