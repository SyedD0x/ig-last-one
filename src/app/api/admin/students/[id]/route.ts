import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, hashPassword } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await db
      .update(students)
      .set({ isActive: false })
      .where(eq(students.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete student error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { password, isActive } = body;

    interface UpdateData {
      passwordHash?: string;
      isActive?: boolean;
    }
    const updateData: UpdateData = {};

    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const [updated] = await db
      .update(students)
      .set(updateData)
      .where(eq(students.id, parseInt(id)))
      .returning({
        id: students.id,
        studentId: students.studentId,
        name: students.name,
        isActive: students.isActive,
      });

    return NextResponse.json({ student: updated });
  } catch (error) {
    console.error("Update student error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
