import BookingSection from "@/components/bookings/bookingSection";
import { verifySession } from "@/utilities/sessions";
import { getUserData } from "@/utilities/user";

export const metadata = {
  title: "Varauskalenteri :: SaLKo",
  description: "SaLKo ry - Varauskalenteri",
};

export default async function Page() {
  const payload = await verifySession();
  const userData = payload ? await getUserData() : null;
  const isLoggedIn = !!payload;

  return (
    <div>
      <BookingSection
        isLoggedIn={isLoggedIn}
        userId={payload?.userId as string | undefined}
        userRole={userData?.role}
      />
    </div>
  );
}
