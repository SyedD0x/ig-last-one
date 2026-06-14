import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students, buses } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    // Require secret key for setup
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    if (secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if already seeded
    const existingStudents = await db.execute(sql`SELECT COUNT(*) as count FROM students`);
    const count = parseInt((existingStudents.rows[0] as { count: string }).count);

    if (count > 0) {
      return NextResponse.json({ message: "Already seeded", count });
    }

    // Create demo students
    const demoStudents = [
      { studentId: "STU001", name: "Alice Johnson", password: "pass123" },
      { studentId: "STU002", name: "Bob Smith", password: "pass456" },
      { studentId: "STU003", name: "Carol Davis", password: "pass789" },
    ];

    for (const s of demoStudents) {
      const passwordHash = await hashPassword(s.password);
      await db.insert(students).values({
        studentId: s.studentId,
        name: s.name,
        passwordHash,
      }).onConflictDoNothing();
    }

    // Create demo buses
    const demoBuses = [
      { busId: "bus1", busName: "Bus 1 – Route A", driverName: "John Driver" },
      { busId: "bus2", busName: "Bus 2 – Route B", driverName: "Jane Driver" },
      { busId: "school_a", busName: "School A Express", driverName: "Mike Driver" },
    ];

    for (const b of demoBuses) {
      await db.insert(buses).values(b).onConflictDoNothing();
    }

    return NextResponse.json({
      success: true,
      message: "Demo data created successfully",
      students: demoStudents.map(s => ({ studentId: s.studentId, password: s.password })),
      adminLogin: { studentId: "admin", password: process.env.ADMIN_SECRET },
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
