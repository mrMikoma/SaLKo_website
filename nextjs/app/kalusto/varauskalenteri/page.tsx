import BookingSection from "@/components/bookings/bookingSection";
import { verifySession } from "@/utilities/sessions";

export const metadata = {
  title: "Varauskalenteri :: SaLKo",
  description: "SaLKo ry - Varauskalenteri",
};

export default async function Page() {
  const payload = await verifySession();
  const isLoggedIn = payload && payload.user ? true : false;

  return (
    <div>
      <BookingSection isLoggedIn={isLoggedIn} />
    </div>
  );
}
