# CLAUDE.md - SaLKo Website Development Guide

This document provides comprehensive guidelines for AI assistants (Claude Code) working on the Savonlinnan Lentokerho (SaLKo) website project.

## Project Overview

**What:** A Next.js web application for Savonlinna Flying Club (Savonlinnan Lentokerho)
**Purpose:** Club website with member portal, aircraft booking system, and admin dashboard
**Language:** Finnish UI, English codebase

---

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 16.x |
| Language | TypeScript | 5.x |
| Database | PostgreSQL | - |
| Auth | NextAuth v5 | beta |
| Styling | Tailwind CSS | 4.x |
| UI Library | Ant Design | 6.x |
| Forms | react-hook-form + Zod | 7.x / 4.x |
| State | React Query | 5.x |
| Date/Time | Luxon | 3.x |

---

## Commands

### Development
```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
# Run migrations (from project root)
psql $DATABASE_CONNECTION_STRING -f postgres/migrations/<file>.sql

# Connect to database
psql $DATABASE_CONNECTION_STRING
```

### Docker
```bash
# Build image
docker build -t salko-web .

# Run container
docker run -p 3000:3000 --env-file .env salko-web
```

### Cronjobs
```bash
# METAR weather updates
npx tsx cronjobs/metar.ts
```

---

## Project Structure

```
nextjs/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (auth, metar, umami)
│   ├── admin/             # Admin pages (protected)
│   ├── jasenalue/         # Member area (protected)
│   ├── kerho/             # Club info pages
│   ├── kalusto/           # Aircraft pages
│   └── ...                # Other public pages
├── components/            # React components
│   ├── admin/             # Admin-specific components
│   ├── auth/              # Login/logout components
│   ├── bookings/          # Booking calendar components
│   ├── bulletings/        # Bulletin board components
│   ├── profile/           # User profile components
│   └── ...                # Shared components
├── hooks/                 # Custom React hooks
├── utilities/             # Server actions & helpers
├── types/                 # TypeScript definitions
├── schemas/               # Zod validation schemas
├── styles/                # Tailwind CSS config
├── providers/             # React context providers
├── public/                # Static assets
└── docs/                  # Documentation
```

---

## Coding Conventions

### File Naming
- **Components:** PascalCase (`BookingModal.tsx`, `UserTableRow.tsx`)
- **Utilities:** camelCase (`bookingHelpers.ts`, `adminUserActions.ts`)
- **Hooks:** camelCase with `use` prefix (`useBookings.ts`, `useMediaQuery.ts`)
- **Types:** PascalCase in dedicated files (`booking.ts`, `user.ts`)
- **Routes:** kebab-case for URLs (`/jasenalue/profiili`, `/kalusto/varaukset`)

### Component Structure

**Server Component (default):**
```tsx
// No directive needed - server by default
import { someServerAction } from "@/utilities/actions"

export default async function PageComponent() {
  const data = await someServerAction()
  return <div>{/* ... */}</div>
}
```

**Client Component:**
```tsx
"use client"

import { useState } from "react"

export default function InteractiveComponent() {
  const [state, setState] = useState(false)
  return <button onClick={() => setState(!state)}>Toggle</button>
}
```

### When to Use Client Components
Use `"use client"` only when you need:
- React hooks (`useState`, `useEffect`, `useContext`)
- Browser APIs (`window`, `document`, `localStorage`)
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Third-party client libraries (React Query hooks, Ant Design interactive components)

### Import Patterns
```tsx
// Use @ alias for all imports from project root
import { BookingType } from "@/types/booking"
import { addBooking } from "@/utilities/bookings"
import { useBookings } from "@/hooks/useBookings"
import BookingModal from "@/components/bookings/BookingModal"
```

### Server Actions Pattern
```tsx
// utilities/example.ts
"use server"

import pool from "@/utilities/db"
import { revalidatePath } from "next/cache"

export async function createItem(data: ItemInput): Promise<ActionResponse<Item>> {
  try {
    // 1. Validate permissions
    const session = await auth()
    if (!session?.user) {
      return { status: "error", error: "Unauthorized" }
    }

    // 2. Validate input
    const validated = ItemSchema.safeParse(data)
    if (!validated.success) {
      return { status: "error", error: "Invalid input" }
    }

    // 3. Database operation
    const result = await pool.query(
      `INSERT INTO items (name, value) VALUES ($1, $2) RETURNING *`,
      [validated.data.name, validated.data.value]
    )

    // 4. Revalidate affected paths
    revalidatePath("/items")

    return { status: "success", result: result.rows[0] }
  } catch (error) {
    console.error("createItem error:", error)
    return { status: "error", error: "Failed to create item" }
  }
}
```

### Response Type Pattern
```tsx
// Always use this pattern for server action responses
interface ActionResponse<T> {
  status: "success" | "error"
  result?: T
  error?: string
}
```

---

## Component Patterns

### Standard Component Template
```tsx
"use client"

import { useState } from "react"
import type { ComponentProps } from "@/types/component"

interface Props {
  data: ComponentProps
  onAction?: (id: string) => void
}

export default function ComponentName({ data, onAction }: Props) {
  const [loading, setLoading] = useState(false)

  const handleAction = async () => {
    setLoading(true)
    try {
      // action logic
      onAction?.(data.id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      {/* component content */}
    </div>
  )
}
```

### Form Component Pattern
```tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useActionState } from "react"
import { submitForm } from "@/utilities/actions"

const FormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
})

type FormData = z.infer<typeof FormSchema>

export default function ExampleForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
  })

  const [state, formAction, pending] = useActionState(submitForm, null)

  return (
    <form action={formAction}>
      <input {...register("name")} className="input-styles" />
      {errors.name && <span className="text-red-500">{errors.name.message}</span>}

      <input {...register("email")} className="input-styles" />
      {errors.email && <span className="text-red-500">{errors.email.message}</span>}

      <button type="submit" disabled={pending}>
        {pending ? "Submitting..." : "Submit"}
      </button>

      {state?.error && <div className="text-red-500">{state.error}</div>}
    </form>
  )
}
```

### Modal Component Pattern
```tsx
"use client"

import { Modal } from "antd"
import { useState } from "react"

interface Props {
  open: boolean
  onClose: () => void
  data?: SomeType
}

export default function ExampleModal({ open, onClose, data }: Props) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      // perform action
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleConfirm}
      confirmLoading={loading}
      title="Modal Title"
    >
      {/* Modal content */}
    </Modal>
  )
}
```

### Data Fetching with React Query
```tsx
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchItems, createItem } from "@/utilities/items"

export function useItems() {
  return useQuery({
    queryKey: ["items"],
    queryFn: fetchItems,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
    },
  })
}
```

---

## Database Patterns

### Connection Usage
```tsx
// Always import from utilities/db
import pool from "@/utilities/db"

// Connection is pooled - no need to manually connect/disconnect
const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId])
```

### Query Patterns

**SELECT with parameters:**
```tsx
const { rows } = await pool.query(
  `SELECT id, name, email, roles
   FROM users
   WHERE id = $1 AND active = true`,
  [userId]
)
```

**INSERT with RETURNING:**
```tsx
const { rows } = await pool.query(
  `INSERT INTO bookings (user_id, plane_id, start_time, end_time)
   VALUES ($1, $2, $3, $4)
   RETURNING *`,
  [userId, planeId, startTime, endTime]
)
const newBooking = rows[0]
```

**UPDATE with conditions:**
```tsx
const { rowCount } = await pool.query(
  `UPDATE users
   SET name = $1, phone = $2, updated_at = NOW()
   WHERE id = $3`,
  [name, phone, userId]
)
if (rowCount === 0) {
  return { status: "error", error: "User not found" }
}
```

**DELETE with safety:**
```tsx
// Always include WHERE clause!
const { rowCount } = await pool.query(
  `DELETE FROM bookings WHERE id = $1 AND user_id = $2`,
  [bookingId, userId]
)
```

### Bulk Operations
```tsx
// For fetching multiple items efficiently
const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ")
const { rows } = await pool.query(
  `SELECT * FROM bookings WHERE id IN (${placeholders})`,
  ids
)
```

### Date/Time Handling
```tsx
import { DateTime } from "luxon"

// Store as ISO string or timestamp
const startTime = DateTime.now().setZone("Europe/Helsinki").toISO()

// Query with timezone awareness
const { rows } = await pool.query(
  `SELECT * FROM bookings
   WHERE start_time >= $1 AND start_time < $2`,
  [startDate.toISO(), endDate.toISO()]
)
```

### DO NOT
- Never use string concatenation for query parameters
- Never expose raw database errors to users
- Never run queries without WHERE on UPDATE/DELETE
- Never store passwords in plain text

---

## Security Practices

### Authentication Checks
```tsx
import { auth } from "@/utilities/auth"
import { hasRole, isAdmin } from "@/utilities/roles"

export async function protectedAction() {
  const session = await auth()

  // Check if logged in
  if (!session?.user) {
    return { status: "error", error: "Unauthorized" }
  }

  // Check for admin role
  if (!isAdmin(session.user)) {
    return { status: "error", error: "Admin access required" }
  }

  // Check for specific role
  if (!hasRole(session.user, "instructor")) {
    return { status: "error", error: "Instructor access required" }
  }
}
```

### Input Validation
```tsx
import { z } from "zod"

// Define schema
const BookingSchema = z.object({
  planeId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().max(500).optional(),
})

// Validate in server action
export async function createBooking(input: unknown) {
  const validated = BookingSchema.safeParse(input)
  if (!validated.success) {
    return {
      status: "error",
      error: validated.error.errors[0].message
    }
  }
  // Use validated.data safely
}
```

### Password Requirements
- Minimum 8 characters, maximum 32
- At least one letter, one number, one special character
- Always hash with bcrypt before storing
```tsx
import bcrypt from "bcrypt"

const hashedPassword = await bcrypt.hash(password, 10)
const isValid = await bcrypt.compare(inputPassword, hashedPassword)
```

### Protected Routes
Routes are protected via middleware in `proxy.ts`:
- `/jasenalue/*` - Requires authenticated user
- `/admin/*` - Requires admin role

### XSS Prevention
- React escapes content by default
- Never use `dangerouslySetInnerHTML` without sanitization
- Validate and sanitize all user inputs

---

## Performance Guidelines

### React Query Configuration
```tsx
// Default settings in QueryProvider
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes
      gcTime: 30 * 60 * 1000,        // 30 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
})
```

### Optimizing Data Fetching
```tsx
// Bulk fetch instead of N+1 queries
// BAD:
for (const id of ids) {
  const booking = await fetchBooking(id)
}

// GOOD:
const bookings = await fetchBookings(ids)
```

### Image Optimization
```tsx
import Image from "next/image"

// Always use Next.js Image component
<Image
  src="/images/plane.jpg"
  alt="Aircraft"
  width={800}
  height={600}
  priority={isAboveFold}
/>
```

### Code Splitting
```tsx
// Dynamic imports for heavy components
import dynamic from "next/dynamic"

const HeavyChart = dynamic(() => import("@/components/HeavyChart"), {
  loading: () => <Spinner />,
  ssr: false,
})
```

### Caching Strategies
```tsx
// Revalidate specific paths after mutations
import { revalidatePath, revalidateTag } from "next/cache"

revalidatePath("/bookings")
revalidateTag("bookings")
```

---

## Styling Guide

### Tailwind Color Palette
```
swhite:   #f6f4f3  (cream white - backgrounds)
sblacked: #0c1821  (dark blue-black - text)
sblued:   #162752  (deep navy - headers)
sblue:    #003580  (sky blue - primary)
sbluel:   #2d7a94  (light blue - accents)
sred:     #e84855  (aviation red - alerts/CTAs)
sgrey:    #e6e6e6  (light grey - borders)
```

### Common Class Patterns
```tsx
// Card
<div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">

// Button primary
<button className="bg-sblue text-white px-4 py-2 rounded-md hover:bg-sblued transition-colors">

// Button danger
<button className="bg-sred text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors">

// Input field
<input className="w-full px-3 py-2 border border-sgrey rounded-md focus:ring-2 focus:ring-sblue focus:border-transparent">

// Container
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

### Custom Animations
```tsx
// Available animation classes
className="animate-float"       // Gentle floating
className="animate-slide-in"    // Slide from right
className="animate-fade-in"     // Fade in
className="animate-pulse-glow"  // Pulsing glow effect
```

### Glass Morphism
```tsx
<div className="glass">
  {/* Frosted glass effect */}
</div>
```

---

## User Roles

| Role | Access Level |
|------|--------------|
| `admin` | Full access - user management, all bookings, settings |
| `user` | Member area, own bookings, profile management |
| `guest` | Can be added to bookings, cannot log in |

### Role Checking
```tsx
import { hasRole, isAdmin, hasAnyRole } from "@/utilities/roles"

// Check single role
if (hasRole(user, "admin")) { }

// Check admin specifically
if (isAdmin(user)) { }

// Check multiple roles
if (hasAnyRole(user, ["admin", "instructor"])) { }
```

---

## Environment Variables

Required variables in `.env`:
```bash
# Database
DATABASE_CONNECTION_STRING=postgresql://user:pass@host:5432/dbname

# Auth
SESSION_SECRET=<base64-encoded-secret>
NEXTAUTH_SECRET=<base64-encoded-secret>
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<client-secret>

# Optional: Analytics
NEXT_PUBLIC_UMAMI_WEBSITE_ID=<umami-id>
```

---

## Common Gotchas

1. **Server vs Client Components:** Default is server. Only add `"use client"` when necessary.

2. **Form Actions:** Use `useActionState` hook with server actions, not `onSubmit` handlers.

3. **Date Handling:** Always use Luxon with `Europe/Helsinki` timezone for consistency.

4. **Database Pool:** Import from `@/utilities/db` - it handles connection pooling automatically.

5. **Auth Session:** Call `auth()` from server components/actions, `useSession()` from client components.

6. **Revalidation:** Always call `revalidatePath()` after mutations to update cached data.

7. **TypeScript:** Project has `strict: false` - be extra careful with null checks.

8. **Finnish Content:** UI text is in Finnish. Keep comments and code in English.

---

## File Locations Reference

| Need | Location |
|------|----------|
| Add new page | `/app/<route>/page.tsx` |
| Add API route | `/app/api/<route>/route.ts` |
| Add component | `/components/<feature>/ComponentName.tsx` |
| Add server action | `/utilities/<feature>.ts` |
| Add type definition | `/types/<entity>.ts` |
| Add validation schema | `/schemas/<entity>.ts` |
| Add custom hook | `/hooks/use<Name>.ts` |
| Modify styles | `/styles/tailwind.css` |
| Add provider | `/providers/<Name>Provider.tsx` |

---

## Existing Documentation

Additional docs in `/docs/`:
- `AUTH_SETUP.md` - Authentication system details
- `BOOKING_MODERNIZATION.md` - Booking system architecture
- `BOOKING_PHASE2_IMPROVEMENTS.md` - Recent booking enhancements
- `BOOKING_PHASE3_TODO.md` - Planned improvements
- `GITHUB_SECRETS_SETUP.md` - CI/CD configuration
- `METAR_SETUP.md` - Weather data integration

---

*Last updated: January 2026*
