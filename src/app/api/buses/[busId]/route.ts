import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { buses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ busId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { busId } = await params;

    await db
      .update(buses)
      .set({ isActive: false })
      .where(eq(buses.busId, busId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete bus error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
