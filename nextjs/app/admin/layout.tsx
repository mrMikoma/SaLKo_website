import AdminNav from "@/components/admin/adminNav";
import PageHero from "@/components/pageHero";
import { isFlightLogEnabled } from "@/utilities/features";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="print:hidden">
        <PageHero
          title="Järjestelmän hallintapaneeli"
          backgroundImage="bg-punkaharju-one"
          compact={true}
          showScrollIndicator={false}
        >
          <AdminNav showFlightLog={isFlightLogEnabled()} />
        </PageHero>
      </div>
      <div className="container mx-auto px-4 py-8 print:p-0 print:max-w-none">
        {children}
      </div>
    </div>
  );
}
