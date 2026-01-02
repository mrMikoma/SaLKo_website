import AdminNav from "@/components/admin/adminNav";
import PageHero from "@/components/pageHero";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <PageHero
        title="Järjestelmän hallintapaneeli"
        backgroundImage="bg-punkaharju-one"
        compact={true}
        showScrollIndicator={false}
        children={<AdminNav />}
      />
      <div className="container mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
