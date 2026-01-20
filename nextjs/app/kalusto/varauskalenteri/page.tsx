import BookingSection from "@/components/bookings/bookingSection";
import { auth } from "@/auth";
import PageHero from "@/components/pageHero";

export const metadata = {
  title: "Varauskalenteri",
  description: "SaLKo ry - Varauskalenteri",
  keywords: [
    "Savonlinnan Lentokerho",
    "varauskalenteri",
    "lentokonevaraukset",
    "lentokoneiden varaus",
    "SaLKo",
    "Savonlinna",
  ],
};

export default async function Page() {
  // Get session if it exists, but don't require it (public access)
  const session = await auth();

  const userContext = {
    isLoggedIn: !!session,
    userId: session?.user?.id || null,
    userName: session?.user?.name || null,
    userRole: session?.user?.roles || ["guest"], // Default to guest for unauthenticated users
    userEmail: session?.user?.email || null,
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Varauskalenteri"
        breadcrumbs={["Kalusto", "Varauskalenteri"]}
        compact={true}
        backgroundImage="bg-mopu-one"
        showScrollIndicator={false}
        children={<BookingSection userContext={userContext} />}
      />
    </div>
  );
}
