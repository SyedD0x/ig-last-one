import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allStudents = await db
      .select({
        id: students.id,
        studentId: students.studentId,
        name: students.name,
        createdAt: students.createdAt,
        isActive: students.isActive,
      })
      .from(students);

    return NextResponse.json({ students: allStudents });
  } catch (error) {
    console.error("Get students error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { studentId, name, password } = body;

    if (!studentId || !name || !password) {
      return NextResponse.json({ error: "Student ID, name, and password are required" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const [newStudent] = await db
      .insert(students)
      .values({ studentId, name, passwordHash })
      .returning({
        id: students.id,
        studentId: students.studentId,
        name: students.name,
        createdAt: students.createdAt,
        isActive: students.isActive,
      });

    return NextResponse.json({ student: newStudent }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("unique")) {
      return NextResponse.json({ error: "Student ID already exists" }, { status: 409 });
    }
    console.error("Create student error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
