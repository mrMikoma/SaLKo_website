import AdminNav from "@/components/admin/adminNav";
import PageHero from "@/components/pageHero";
import { isBillingEnabled, isFlightLogEnabled } from "@/utilities/features";
import { auth } from "@/auth";
import { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="print:hidden">
        <PageHero
          title="Järjestelmän hallintapaneeli"
          backgroundImage="punkaharju"
          compact={true}
          showScrollIndicator={false}
        >
          <AdminNav
            showFlightLog={isFlightLogEnabled()}
            showBilling={isBillingEnabled()}
            roles={session?.user?.roles ?? []}
          />
        </PageHero>
      </div>
      <div className="container mx-auto px-4 py-8 print:p-0 print:max-w-none">
        {children}
      </div>
    </div>
  );
}
