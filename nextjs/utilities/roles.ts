/**
 * Role-Based Access Control (RBAC) utilities
 * Defines roles and permissions for the application
 */

export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  GUEST: "guest",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Permission definitions
 * Each permission maps to an array of roles that have access
 */
export const PERMISSIONS = {
  // Bookings
  CREATE_OWN_BOOKING: ["admin", "user", "guest"] as Role[],
  VIEW_OWN_BOOKING: ["admin", "user", "guest"] as Role[],
  EDIT_OWN_BOOKING: ["admin", "user"] as Role[],
  DELETE_OWN_BOOKING: ["admin", "user"] as Role[],
  VIEW_ALL_BOOKINGS: ["admin"] as Role[],
  DELETE_ANY_BOOKING: ["admin"] as Role[],
  VIEW_BOOKING_CONTACT_INFO: ["admin"] as Role[], // For guest bookings

  // Users
  VIEW_USER_LIST: ["admin"] as Role[],
  CREATE_USER: ["admin"] as Role[],
  EDIT_USER: ["admin"] as Role[],
  DELETE_USER: ["admin"] as Role[],
  INVITE_USER: ["admin"] as Role[],
  CHANGE_USER_ROLE: ["admin"] as Role[],

  // Profile
  VIEW_OWN_PROFILE: ["admin", "user"] as Role[],
  EDIT_OWN_PROFILE: ["admin", "user"] as Role[],

  // Admin site
  ACCESS_ADMIN_SITE: ["admin"] as Role[],
  VIEW_ANALYTICS: ["admin"] as Role[],
  MANAGE_SETTINGS: ["admin"] as Role[],
};

/**
 * Check if a user with given roles has a specific permission
 * @param userRoles - Array of roles the user has
 * @param permission - The permission to check
 * @returns true if any of the user's roles has the permission, false otherwise
 */
export function hasPermission(
  userRoles: string[],
  permission: keyof typeof PERMISSIONS
): boolean {
  if (!userRoles || !Array.isArray(userRoles)) return false;
  return userRoles.some((role) =>
    PERMISSIONS[permission].includes(role as Role)
  );
}

/**
 * Check if user has a specific role
 * @param userRoles - Array of roles the user has
 * @param role - The role to check for
 * @returns true if the user has the role, false otherwise
 */
export function hasRole(userRoles: string[], role: Role): boolean {
  if (!userRoles || !Array.isArray(userRoles)) return false;
  return userRoles.includes(role);
}

/**
 * Check if a user can manage a booking
 * @param userRoles - Array of roles the user has
 * @param userId - The ID of the user
 * @param bookingUserId - The ID of the user who created the booking
 * @returns true if the user can manage the booking, false otherwise
 */
export function canManageBooking(
  userRoles: string[],
  userId: string,
  bookingUserId: string
): boolean {
  if (!userRoles || !Array.isArray(userRoles)) return false;

  // Admin can manage any booking
  if (userRoles.includes(ROLES.ADMIN)) {
    return true;
  }

  // Users can only manage their own bookings
  if (userRoles.includes(ROLES.USER) && userId === bookingUserId) {
    return true;
  }

  // Guests cannot manage bookings
  return false;
}

/**
 * Check if a user can delete a booking
 * @param userRoles - Array of roles the user has
 * @param userId - The ID of the user
 * @param bookingUserId - The ID of the user who created the booking
 * @returns true if the user can delete the booking, false otherwise
 */
export function canDeleteBooking(
  userRoles: string[],
  userId: string,
  bookingUserId: string
): boolean {
  if (!userRoles || !Array.isArray(userRoles)) return false;

  // Admin can delete any booking
  if (userRoles.includes(ROLES.ADMIN)) {
    return true;
  }

  // Users can only delete their own bookings
  if (userRoles.includes(ROLES.USER) && userId === bookingUserId) {
    return true;
  }

  // Guests cannot delete bookings
  return false;
}

/**
 * Get a user-friendly role display name
 * @param role - The role to get the display name for
 * @returns The display name of the role
 */
export function getRoleDisplayName(role: string): string {
  const displayNames: Record<string, string> = {
    admin: "Järjestelmänvalvoja",
    user: "Käyttäjä",
    guest: "Vieras",
  };

  return displayNames[role] || role;
}

/**
 * Get display names for multiple roles
 * @param roles - Array of roles
 * @returns Array of display names
 */
export function getRolesDisplayNames(roles: string[]): string[] {
  if (!roles || !Array.isArray(roles)) return [];
  return roles.map((role) => getRoleDisplayName(role));
}
