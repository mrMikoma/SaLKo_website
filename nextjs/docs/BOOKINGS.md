# Booking calendar

How `/kalusto/varauskalenteri` works as of October 2026. The `BOOKING_*` documents next to this one describe the 2025 redesign, and their task lists are out of date.

## Pieces

| File | Role |
|---|---|
| `app/kalusto/varauskalenteri/page.tsx` | Server page; passes the session's id and roles to the calendar |
| `components/bookings/bookingSection.tsx` | Calendar shell: date picker, view selector, the views, the modal |
| `components/bookings/Bookings{Desktop,Mobile,Week,Month}View.tsx` | Day (desktop table, mobile list), week and month views |
| `components/bookings/bookingModal.tsx` | Create, update and view a booking; the saved screen with calendar links |
| `components/bookings/BookingCalendarLinks.tsx` | Google Calendar link and `.ics` download |
| `hooks/useBookings.ts` | TanStack Query: fetch a date range, save, remove |
| `utilities/bookings.ts` | Server actions |
| `schemas/bookingSchema.ts` | Zod schemas for the modal forms and the server input |
| `utilities/clubTime.ts` | Club time (see below) |
| `utilities/calendarExport.ts`, `app/api/varaukset/[id]/kalenteri/route.ts` | iCalendar export |
| `e2e/bookings.spec.ts` | E2E tests (local database only) |

## Club time

A booking at 10:00 means 10:00 in Savonlinna. `utilities/clubTime.ts` sets Luxon's default zone to `Europe/Helsinki` and re-exports `DateTime`. Booking code imports `DateTime` from there, never from `"luxon"`.

This keeps times right in three places:
- in a browser running in another zone;
- on the server, which runs in UTC in its container;
- across DST changes.

The database stores UTC (`timestamptz`). Date ranges, day boundaries and recurring series are worked out in club time.

## Who sees and does what

| | Anonymous | Member | Admin |
|---|---|---|---|
| See bookings | "Varattu" + aircraft + type | Title, description, booker's name, email and phone | Same, plus guest contact details |
| Create | Guest booking (with contact details), not recurring | Own bookings, recurring too | Same |
| Update / delete | — | Own bookings | Any booking |
| Calendar export | Google link right after their own guest booking | Google link and `.ics` | Same |

Two things enforce this:
- The server actions take the user from `auth()` and check `PERMISSIONS` from `utilities/roles.ts`, plus `canManageBooking` / `canDeleteBooking`.
- `fetchBookingsForDateRange` builds each booking from an allowlist of fields for the viewer.

Hiding buttons in the client is only cosmetic.

## Saving

The modal calls `saveBooking` from `useBookings`, which picks one of four server actions:
- `updateBooking` when the booking has an id;
- `addGuestBooking` when there are contact details;
- `addRepeatingBookings` when there is a repeat end date;
- `addBooking` otherwise.

Each returns one of:
- `{ status: "success", result }`;
- `{ status: "conflict", conflicts }`;
- `{ status: "error", error }`, with a Finnish message.

The modal stays open until it has an answer.

- **Overlaps** are allowed, but the server warns first. On `conflict`, the modal lists the overlapping bookings and the save button becomes "Varaa silti", which resends with `allowOverlap: true`.
- **Recurring bookings** are one booking per day from the start day to the repeat end date, inclusive, at the same club-time hours, sharing a `repeat_group_id`.
  - The series is saved in one transaction and is limited to 366 days.
  - The repeat end date is kept separate from `end_time`.
  - Deleting with "Poista myös kaikki seuraavat" removes this booking and the later ones in the group. For a member, only their own.
- **Full-day bookings** run from 00:00 to 00:00 of the day after the last booked day. An end is exclusive, so a booking that ends at midnight doesn't appear on the next day (`getBookingDays` in `utilities/bookingHelpers.ts`).
- **Times** are on the hour, and a booking lasts at least an hour. The Zod schemas check this in the modal and again on the server.

## Aircraft

The calendar shows the aircraft with `"bookable": true` in `data/planes.json` (`BOOKABLE_PLANES` in `utilities/planeHelpers.ts`), in file order. OH-PDX is `false` while it is being restored.

## Calendar export

After a new booking is saved, and in an existing booking's modal, `BookingCalendarLinks` offers two links:
- **Google Calendar:** an "add event" link with club-time hours and `ctz`. A series becomes a daily `RRULE` with a count.
- **`.ics`:** `GET /api/varaukset/:id/kalenteri` (with `?sarja=1` for the rest of a series), served as `text/calendar` so that iPhones offer "Add to Calendar". It needs a session.
