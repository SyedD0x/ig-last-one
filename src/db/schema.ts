import {
  pgTable,
  serial,
  text,
  varchar,
  real,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

// Students table
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// Bus locations table (live + history)
export const busLocations = pgTable("bus_locations", {
  id: serial("id").primaryKey(),
  busId: varchar("bus_id", { length: 50 }).notNull(),
  busName: varchar("bus_name", { length: 100 }).notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  speed: real("speed").default(0).notNull(),
  heading: real("heading").default(0).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// Sessions table (simple JWT-based, stored for logout/blacklist)
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isRevoked: boolean("is_revoked").default(false).notNull(),
});

// Buses registry
export const buses = pgTable("buses", {
  id: serial("id").primaryKey(),
  busId: varchar("bus_id", { length: 50 }).notNull().unique(),
  busName: varchar("bus_name", { length: 100 }).notNull(),
  driverName: varchar("driver_name", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});
