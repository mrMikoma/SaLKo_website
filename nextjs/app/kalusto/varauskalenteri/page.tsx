import BookingSection from "@/components/bookings/bookingSection";
import { auth } from "@/auth";
import PageHero from "@/components/pageHero";
import { pageMetadata } from "@/utilities/seo";

export const metadata = pageMetadata({
  title: "Varauskalenteri – kerhon koneiden varaukset",
  description:
    "Savonlinnan Lentokerhon lentokoneiden varauskalenteri: katso koneiden varaukset ja vapaat ajat.",
  path: "/kalusto/varauskalenteri",
});

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
      >
        <BookingSection userContext={userContext} />
      </PageHero>
    </div>
  );
}
