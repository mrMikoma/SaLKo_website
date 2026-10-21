/**
 * Role-Based Access Control (RBAC) utilities
 * Defines roles and permissions for the application
 */

export const ROLES = {
  ADMIN: "admin",
  // Laskuttaja: the flight log and billing, not the rest of the admin site.
  // An extra role on top of "user".
  TREASURER: "treasurer",
  USER: "user",
  GUEST: "guest",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// The roles an admin can give, in the order the user forms show them
export const ASSIGNABLE_ROLES: Role[] = [ROLES.ADMIN, ROLES.TREASURER, ROLES.USER, ROLES.GUEST];

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

  // Bulletins: write, publish and delete, and see the drafts
  MANAGE_BULLETINS: ["admin"] as Role[],

  // Flight logging
  LOG_OWN_FLIGHT: ["admin", "user"] as Role[],
  VIEW_OWN_FLIGHTS: ["admin", "user"] as Role[],
  VIEW_ALL_FLIGHTS: ["admin", "treasurer"] as Role[],
  EDIT_ANY_FLIGHT: ["admin"] as Role[],
  // Sync the sheet and match pilot names to members
  MANAGE_FLIGHT_LOG: ["admin", "treasurer"] as Role[],

  // Billing: members see what they were billed; admins run the periods,
  // mark payments and set the prices
  VIEW_OWN_BILLING: ["admin", "user"] as Role[],
  MANAGE_BILLING: ["admin", "treasurer"] as Role[],

  // Flight statistics and the Traficom report
  VIEW_STATISTICS: ["admin", "treasurer"] as Role[],
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
    treasurer: "Laskuttaja",
    user: "Käyttäjä",
    guest: "Vieras",
  };

  return displayNames[role] || role;
}

/**
 * The roles an admin gives an account, without unknown names. The treasurer
 * role is an extra: it opens billing, not the member pages, so it comes with
 * "user" (or "admin").
 */
export function validateRoles(roles: string[]): { roles: Role[] } | { error: string } {
  const valid = ASSIGNABLE_ROLES.filter((role) => roles.includes(role));
  if (valid.length === 0) {
    return { error: "Käyttäjällä täytyy olla vähintään yksi rooli" };
  }
  if (valid.includes(ROLES.TREASURER) && !valid.includes(ROLES.USER) && !valid.includes(ROLES.ADMIN)) {
    return { error: "Laskuttajalla pitää olla myös Käyttäjä-rooli" };
  }
  return { roles: valid };
}

// The parts of the admin site that roles other than admin can open, by the
// permission each needs. An admin opens all of /admin.
const ADMIN_SECTIONS: { path: string; permission: keyof typeof PERMISSIONS }[] = [
  { path: "/admin/laskutus", permission: "MANAGE_BILLING" },
  { path: "/admin/lennot", permission: "VIEW_ALL_FLIGHTS" },
  { path: "/admin/tilastot", permission: "VIEW_STATISTICS" },
];

/** Whether these roles may open a path under /admin */
export function canOpenAdminPath(roles: string[], pathname: string): boolean {
  if (hasPermission(roles, "ACCESS_ADMIN_SITE")) return true;
  return ADMIN_SECTIONS.some(
    (section) =>
      (pathname === section.path || pathname.startsWith(`${section.path}/`)) &&
      hasPermission(roles, section.permission)
  );
}

/** Where the admin site starts for these roles, or null if they have none of it */
export function adminHome(roles: string[]): string | null {
  if (hasPermission(roles, "ACCESS_ADMIN_SITE")) return "/admin";
  return ADMIN_SECTIONS.find((section) => hasPermission(roles, section.permission))?.path ?? null;
}
