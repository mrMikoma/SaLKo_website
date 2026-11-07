/**
 * What a server action answers: the result, or a Finnish message to show.
 * Every action file uses this one shape (nextjs/CLAUDE.md, Server actions),
 * so the components and callAction() handle them all the same way. Bookings
 * add a third answer, the overlap conflict (BookingResult in bookings.ts).
 *
 * Not a "use server" file: those may only export async functions.
 */
export type ActionResult<T = null> =
  | { status: "success"; result: T }
  | { status: "error"; error: string };
