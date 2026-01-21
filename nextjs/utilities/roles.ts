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
 * Check if a user role (or any of their roles) has a specific permission
 * @param userRoles - The role(s) of the user (single role or array of roles)
 * @param permission - The permission to check
 * @returns true if any of the roles has the permission, false otherwise
 */
export function hasPermission(
  userRoles: Role | Role[] | string | string[],
  permission: keyof typeof PERMISSIONS,
): boolean {
  const rolesArray = Array.isArray(userRoles) ? userRoles : [userRoles];
  return rolesArray.some((role) =>
    PERMISSIONS[permission].includes(role as Role),
  );
}

/**
 * Check if a user can manage a booking
 * @param userRoles - The role(s) of the user (single role or array of roles)
 * @param userId - The ID of the user
 * @param bookingUserId - The ID of the user who created the booking
 * @returns true if the user can manage the booking, false otherwise
 */
export function canManageBooking(
  userRoles: Role | Role[] | string | string[],
  userId: string,
  bookingUserId: string,
): boolean {
  const rolesArray = Array.isArray(userRoles) ? userRoles : [userRoles];

  // Admin can manage any booking
  if (rolesArray.includes(ROLES.ADMIN)) {
    return true;
  }

  // Users can only manage their own bookings
  if (rolesArray.includes(ROLES.USER) && userId === bookingUserId) {
    return true;
  }

  // Guests cannot manage bookings
  return false;
}

/**
 * Check if a user can delete a booking
 * @param userRoles - The role(s) of the user (single role or array of roles)
 * @param userId - The ID of the user
 * @param bookingUserId - The ID of the user who created the booking
 * @returns true if the user can delete the booking, false otherwise
 */
export function canDeleteBooking(
  userRoles: Role | Role[] | string | string[],
  userId: string,
  bookingUserId: string,
): boolean {
  const rolesArray = Array.isArray(userRoles) ? userRoles : [userRoles];

  // Admin can delete any booking
  if (rolesArray.includes(ROLES.ADMIN)) {
    return true;
  }

  // Users can only delete their own bookings
  if (rolesArray.includes(ROLES.USER) && userId === bookingUserId) {
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
export function getRoleDisplayName(role: Role | string): string {
  const displayNames: Record<string, string> = {
    admin: "Järjestelmänvalvoja",
    user: "Käyttäjä",
    guest: "Vieras",
  };

  return displayNames[role] || role;
}
