import BookingSection from "@/components/bookings/bookingSection";
import { auth } from "@/auth";

export const metadata = {
  title: "Varauskalenteri :: SaLKo",
  description: "SaLKo ry - Varauskalenteri",
};

export default async function Page() {
  // Get session if it exists, but don't require it (public access)
  const session = await auth();

  const userContext = {
    isLoggedIn: !!session,
    userId: session?.user?.id || null,
    userName: session?.user?.name || null,
    userRole: session?.user?.role || "guest", // Default to guest for unauthenticated users
    userEmail: session?.user?.email || null,
  };

  return (
    <div>
      <BookingSection userContext={userContext} />
    </div>
  );
}
