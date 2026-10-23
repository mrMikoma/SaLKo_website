import { describe, expect, test } from "bun:test";
import { adminHome, canOpenAdminPath, hasPermission, validateRoles } from "@/utilities/roles";

const treasurer = ["user", "treasurer"];

describe("the treasurer role", () => {
  test("bills and checks flights, like an admin", () => {
    for (const permission of ["MANAGE_BILLING", "VIEW_ALL_FLIGHTS", "MANAGE_FLIGHT_LOG"] as const) {
      expect(hasPermission(treasurer, permission)).toBe(true);
      expect(hasPermission(["admin"], permission)).toBe(true);
      expect(hasPermission(["user"], permission)).toBe(false);
    }
    expect(hasPermission(treasurer, "CHANGE_USER_ROLE")).toBe(false);
    expect(hasPermission(treasurer, "ACCESS_ADMIN_SITE")).toBe(false);
  });

  test("opens only the flight log and billing of the admin site", () => {
    expect(canOpenAdminPath(treasurer, "/admin/laskutus")).toBe(true);
    expect(canOpenAdminPath(treasurer, "/admin/laskutus/3/csv")).toBe(true);
    expect(canOpenAdminPath(treasurer, "/admin/lennot/tuonti")).toBe(true);
    expect(canOpenAdminPath(treasurer, "/admin/laskut/12")).toBe(true);
    expect(canOpenAdminPath(["user"], "/admin/laskut")).toBe(false);
    expect(canOpenAdminPath(treasurer, "/admin")).toBe(false);
    expect(canOpenAdminPath(treasurer, "/admin/users")).toBe(false);
    // A prefix of a section's path is not the section
    expect(canOpenAdminPath(treasurer, "/admin/lennotx")).toBe(false);
    expect(canOpenAdminPath(["admin"], "/admin/users")).toBe(true);
    expect(canOpenAdminPath(["user"], "/admin/laskutus")).toBe(false);
  });

  test("starts the admin site at billing", () => {
    expect(adminHome(treasurer)).toBe("/admin/laskutus");
    expect(adminHome(["admin"])).toBe("/admin");
    expect(adminHome(["user"])).toBeNull();
  });

  test("comes on top of a member's role", () => {
    expect(validateRoles(["treasurer"])).toEqual({ error: "Laskuttajalla pitää olla myös Käyttäjä-rooli" });
    expect(validateRoles(["user", "treasurer", "pilot"])).toEqual({ roles: ["treasurer", "user"] });
    expect(validateRoles(["admin", "treasurer"])).toEqual({ roles: ["admin", "treasurer"] });
    expect(validateRoles(["nobody"])).toEqual({ error: "Käyttäjällä täytyy olla vähintään yksi rooli" });
  });
});
