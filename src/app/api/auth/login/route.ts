import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, generateToken, getTokenExpiry } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, password } = body;

    if (!studentId || !password) {
      return NextResponse.json({ error: "Student ID and password are required" }, { status: 400 });
    }

    // Check admin login
    if (studentId === "admin" && password === process.env.ADMIN_SECRET) {
      const token = generateToken({
        studentId: 0,
        studentIdStr: "admin",
        name: "Administrator",
        role: "admin",
      });

      const response = NextResponse.json({
        success: true,
        user: { studentId: "admin", name: "Administrator", role: "admin" },
      });

      response.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: getTokenExpiry(),
        path: "/",
      });

      return response;
    }

    // Find student
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.studentId, studentId))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!student.isActive) {
      return NextResponse.json({ error: "Account is deactivated" }, { status: 403 });
    }

    const isValid = await verifyPassword(password, student.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = generateToken({
      studentId: student.id,
      studentIdStr: student.studentId,
      name: student.name,
      role: "student",
    });

    const response = NextResponse.json({
      success: true,
      user: {
        studentId: student.studentId,
        name: student.name,
        role: "student",
      },
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: getTokenExpiry(),
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
