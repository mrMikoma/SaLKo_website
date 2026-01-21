"use server";

import { auth } from "@/auth";
import pool from "@/utilities/db";
import { hasPermission } from "@/utilities/roles";

export interface UserStats {
  total: number;
  admins: number;
  users: number;
  guests: number;
  google_users: number;
}

export interface BookingStats {
  total: number;
  upcoming: number;
  past: number;
}

export interface RecentUser {
  id: string;
  name: string;
  full_name: string;
  email: string;
  roles: string[];
  created_at: string;
  last_login: string | null;
}

export interface DashboardStats {
  users: UserStats;
  bookings: BookingStats;
  recentUsers: RecentUser[];
}

/**
 * Get dashboard statistics (admin only)
 */
export async function getDashboardStats(): Promise<DashboardStats | null> {
  try {
    const session = await auth();

    if (
      !session?.user?.roles ||
      !hasPermission(session.user.roles, "ACCESS_ADMIN_SITE")
    ) {
      return null;
    }

    const [userStats, bookingStats, recentUsers] = await Promise.all([
      // User statistics
      pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE 'admin' = ANY(roles)) as admins,
          COUNT(*) FILTER (WHERE 'user' = ANY(roles)) as users,
          COUNT(*) FILTER (WHERE 'guest' = ANY(roles)) as guests,
          COUNT(*) FILTER (WHERE auth_provider = 'google') as google_users
        FROM users`,
      ),
      // Booking statistics
      pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE start_time >= NOW()) as upcoming,
          COUNT(*) FILTER (WHERE start_time < NOW()) as past
        FROM bookings`,
      ),
      // Recent users
      pool.query(
        `SELECT id, name, full_name, email, roles, created_at, last_login
        FROM users
        ORDER BY created_at DESC
        LIMIT 5`,
      ),
    ]);

    return {
      users: userStats.rows[0] as UserStats,
      bookings: bookingStats.rows[0] as BookingStats,
      recentUsers: recentUsers.rows as RecentUser[],
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return null;
  }
}
