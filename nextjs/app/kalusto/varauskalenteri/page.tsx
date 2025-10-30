import BookingSection from "@/components/bookings/bookingSection";
import { auth } from "@/auth";

export const metadata = {
  title: "Varauskalenteri :: SaLKo",
  description: "SaLKo ry - Varauskalenteri",
};

export default async function Page() {
  // Get session if it exists, but don't require it (public access)
  const session = await auth();

  const isLoggedIn = !!session;
  const userId = session?.user?.id;
  const userRole = session?.user?.role || "guest"; // Default to guest for unauthenticated users

  return (
    <div>
      <BookingSection
        isLoggedIn={isLoggedIn}
        userId={userId}
        userRole={userRole}
      />
    </div>
  );
}
