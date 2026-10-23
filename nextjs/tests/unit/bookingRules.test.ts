import { describe, expect, test } from "bun:test";
import { buildIcs } from "@/utilities/calendarExport";
import { guestBookingTitle } from "@/schemas/bookingSchema";

describe("a guest booking's stored title", () => {
  test("is the title and the guest's name", () => {
    expect(guestBookingTitle("Koululento", "Matti Meikäläinen")).toBe("Koululento (Matti Meikäläinen)");
  });

  test("stays within the 100 characters an edit allows", () => {
    const title = "x".repeat(100);
    const stored = guestBookingTitle(title, "Matti Meikäläinen");
    expect(stored.length).toBeLessThanOrEqual(100);
    expect(stored).toEndWith(" (Matti Meikäläinen)");
    // A very long name is left out; it is in guest_bookings anyway
    expect(guestBookingTitle(title, "y".repeat(100))).toBe(title);
  });
});

describe("the .ics file", () => {
  const event = {
    id: 7,
    plane: "OH-CON",
    title: "Lento",
    description: "",
    start_time: "2027-03-27T08:00:00.000Z",
    end_time: "2027-03-27T10:00:00.000Z",
  };

  test("a title or description can't start lines of its own", () => {
    const ics = buildIcs([
      {
        ...event,
        title: "Lento\rEND:VEVENT\rBEGIN:VEVENT\rSUMMARY:Injected",
        description: "Rivi 1\r\nRivi 2\nRivi 3\u0007",
      },
    ]);
    // Unfolded, the only line breaks are the file's own CRLFs between fields
    const lines = ics.replace(/\r\n /g, "").split("\r\n");
    expect(lines.filter((line) => line === "BEGIN:VEVENT")).toHaveLength(1);
    expect(lines.some((line) => /\r|\n/.test(line))).toBe(false);
    expect(lines).toContain("SUMMARY:OH-CON: Lento\\nEND:VEVENT\\nBEGIN:VEVENT\\nSUMMARY:Injected");
    expect(lines).toContain("DESCRIPTION:Rivi 1\\nRivi 2\\nRivi 3");
  });

  test("times are in UTC", () => {
    const ics = buildIcs([event]);
    expect(ics).toContain("DTSTART:20270327T080000Z");
    expect(ics).toContain("DTEND:20270327T100000Z");
  });
});
