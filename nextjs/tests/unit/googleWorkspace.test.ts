import { describe, expect, test } from "bun:test";
import { workspaceEmail } from "@/utilities/googleWorkspace";

const member = { email: "M.Meikalainen@savonlinnanlentokerho.fi", email_verified: true, hd: "savonlinnanlentokerho.fi" };

describe("Google logins", () => {
  test("accept a verified address of the club's Workspace, lower-cased", () => {
    expect(workspaceEmail(member)).toBe("m.meikalainen@savonlinnanlentokerho.fi");
  });

  test("need the Workspace in the token, not just the domain in the address", () => {
    expect(workspaceEmail({ ...member, hd: undefined })).toBeNull();
    expect(workspaceEmail({ ...member, hd: "example.fi" })).toBeNull();
  });

  test("need an address Google has verified", () => {
    expect(workspaceEmail({ ...member, email_verified: false })).toBeNull();
    expect(workspaceEmail({ ...member, email_verified: "true" })).toBeNull();
    expect(workspaceEmail({ ...member, email_verified: undefined })).toBeNull();
  });

  test("refuse an address outside the domain even with the right Workspace", () => {
    expect(workspaceEmail({ ...member, email: "someone@example.fi" })).toBeNull();
    expect(workspaceEmail({ ...member, email: "x@savonlinnanlentokerho.fi.example.fi" })).toBeNull();
    expect(workspaceEmail({ ...member, email: undefined })).toBeNull();
    expect(workspaceEmail(undefined)).toBeNull();
  });
});
