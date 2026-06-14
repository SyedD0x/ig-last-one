# 🚌 BusTracker – Real-Time School Bus Tracking

A complete real-time school bus tracking web application built with **Next.js 16**, **PostgreSQL**, **Leaflet maps**, and **GraphHopper routing**.

---

## 🚀 Features

### Student Side
- 🔐 **Secure login** – Student ID + password (bcrypt hashed in DB)
- 🗺️ **Full-screen live map** – Leaflet + OpenStreetMap/CartoDB tiles
- 🚌 **Live bus tracking** – Markers update every 3 seconds via polling
- 📍 **Student location** – Share your location with one click
- 📏 **Real road distance & ETA** – GraphHopper API (falls back to straight-line)
- 🔵 **Route polyline** – Blue line along roads connecting student to bus
- 💨 **Bus speed display** – Calculated from GPS updates
- 🔽 **Bus selector** – Choose between Bus 1, Bus 2, School A, etc.
- 🧪 **Demo simulation** – Built-in fake bus movement for testing
- 🚪 **Logout** – Destroys session cookie

### Driver Side (`/driver`)
- No login required
- Select registered bus or enter custom Bus ID
- **Start/Stop sharing** GPS every 3 seconds
- Live status display with speed, heading, coordinates, update count

### Trip History (`/history`)
- Date picker + bus selector
- Full route polyline drawn on map for selected day
- Trip stats: points, total distance, avg speed, start time
- **Animated playback** – Slider + play/pause button

### Admin Panel (`/admin`)
- Protected – admin login required
- **Create students** – ID, name, password (auto-hashed)
- **View/manage all students** – Deactivate, reactivate, reset passwords
- **Manage buses** – Add, view, remove buses
- **Quick demo setup** – One click to seed demo data
- System info + quick links

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL via Drizzle ORM |
| Maps | Leaflet + CartoDB/OpenStreetMap tiles |
| Routing | GraphHopper API (free key) |
| Auth | JWT in HTTP-only cookies (bcryptjs) |
| Styling | Tailwind CSS + custom glassmorphism CSS |
| Real-time | HTTP polling every 3 seconds |

---

## ⚡ Quick Start (Local)

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database (or use the included sandbox)

### 2. Clone & Install
```bash
git clone <your-repo-url>
cd bus-tracker
npm install
```

### 3. Configure Environment
Create `.env` in the project root:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bustracker
JWT_SECRET=your_random_secret_here_change_this
ADMIN_SECRET=your_admin_password_change_this
GRAPHHOPPER_API_KEY=your_graphhopper_key_or_demo
NEXT_PUBLIC_GRAPHHOPPER_API_KEY=your_graphhopper_key_or_demo
```

### 4. Set Up Database
```bash
npx drizzle-kit push
```

### 5. Seed Demo Data
```bash
# Start the dev server first
npm run dev

# In another terminal, run:
curl -X POST "http://localhost:3000/api/setup?secret=YOUR_ADMIN_SECRET"
```

### 6. Start Development
```bash
npm run dev
```

Open http://localhost:3000

---

## 🔑 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin_bus_tracker_2024` |
| Student 1 | `STU001` | `pass123` |
| Student 2 | `STU002` | `pass456` |
| Student 3 | `STU003` | `pass789` |

> ⚠️ **Change these in production!** Update `ADMIN_SECRET` in `.env`

---

## 🗺️ Application Routes

| URL | Description |
|-----|-------------|
| `/` | Redirects to login or dashboard |
| `/login` | Student & admin login |
| `/dashboard` | Full-screen live bus map (student) |
| `/history` | Past trip history + playback |
| `/driver` | Driver GPS sharing portal |
| `/admin` | Admin management panel |

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with studentId + password |
| POST | `/api/auth/logout` | Logout (clear cookie) |
| GET | `/api/auth/me` | Get current user info |
| GET | `/api/buses` | List all active buses |
| POST | `/api/buses` | Add a bus (admin only) |
| DELETE | `/api/buses/[busId]` | Remove a bus (admin only) |
| POST | `/api/location/update` | Driver: send GPS location |
| GET | `/api/location/live` | Get latest location of all buses |
| GET | `/api/location/history?busId=bus1&date=2024-01-15` | Past trip data |
| GET | `/api/route-info?fromLat=...&fromLng=...&toLat=...&toLng=...` | Road distance + ETA |
| GET | `/api/admin/students` | List students (admin only) |
| POST | `/api/admin/students` | Create student (admin only) |
| PATCH | `/api/admin/students/[id]` | Update/reset password (admin only) |
| DELETE | `/api/admin/students/[id]` | Deactivate student (admin only) |
| POST | `/api/simulate?secret=...` | Advance fake bus locations (demo) |
| POST | `/api/setup?secret=...` | One-time demo data seed |

---

## 🚀 Deployment

### Backend + Frontend (Vercel / Render)

1. Push code to GitHub
2. Connect to [Vercel](https://vercel.com) or [Render](https://render.com)
3. Set environment variables:
   ```
   DATABASE_URL=your_postgres_connection_string
   JWT_SECRET=random_32+_char_secret
   ADMIN_SECRET=your_secure_admin_password
   GRAPHHOPPER_API_KEY=your_key
   ```
4. Deploy

### Database (Railway / Neon / Supabase)
1. Create a free PostgreSQL instance
2. Copy connection string to `DATABASE_URL`
3. Run `npx drizzle-kit push` to apply schema
4. Run setup endpoint to seed data

### GraphHopper API Key
1. Sign up at [graphhopper.com](https://graphhopper.com/dashboard)
2. Create a free API key (500 requests/day)
3. Add to `.env` as `GRAPHHOPPER_API_KEY`
4. If not configured, the app falls back to straight-line distance

---

## 📱 Mobile Support

The app is fully responsive and works on:
- 📱 iPhone SE and larger phones
- 📟 Tablets
- 💻 Laptops and desktops

---

## 🔒 Security Notes

- Passwords are hashed with **bcrypt** (12 rounds)
- Auth tokens are **HTTP-only cookies** (not accessible from JavaScript)
- JWT expires after **7 days**
- Admin endpoints require admin role in JWT
- Driver location updates require bus ID (no auth – add PIN for production)

---

## 🧰 Database Schema

```sql
-- Students
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Buses
CREATE TABLE buses (
  id SERIAL PRIMARY KEY,
  bus_id VARCHAR(50) UNIQUE NOT NULL,
  bus_name VARCHAR(100) NOT NULL,
  driver_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Bus Locations (live + history)
CREATE TABLE bus_locations (
  id SERIAL PRIMARY KEY,
  bus_id VARCHAR(50) NOT NULL,
  bus_name VARCHAR(100) NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  speed REAL DEFAULT 0,
  heading REAL DEFAULT 0,
  timestamp TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

---

## 🧪 Demo Simulation

No real buses? Use the built-in simulator:
1. Click **"▶ Start Demo"** in the dashboard sidebar
2. Three buses (Bus 1, Bus 2, School A Express) will move around a NYC-area route
3. Click **"⏹ Stop Demo"** to stop

Or via API:
```bash
curl -X POST "http://localhost:3000/api/simulate?secret=admin_bus_tracker_2024"
```

---

## 📝 License

MIT – Free to use for educational purposes.
