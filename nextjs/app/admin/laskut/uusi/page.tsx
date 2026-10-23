export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isFlightLogEnabled } from "@/utilities/features";
import { getInvoiceRecipients } from "@/utilities/invoiceData";
import { invoicePresets } from "@/utilities/invoices";
import NewInvoiceForm from "@/components/invoices/NewInvoiceForm";

export const metadata = {
  title: "Uusi lasku | Ylläpito",
};

export default async function NewInvoicePage() {
  if (!isFlightLogEnabled()) {
    notFound();
  }
  const session = await auth();
  if (!session?.user?.roles || !hasPermission(session.user.roles, "MANAGE_BILLING")) {
    redirect("/");
  }
  const recipients = await getInvoiceRecipients();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/laskut" className="text-sm text-sblue hover:underline">
          ← Laskut
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-1">Uusi lasku</h1>
        <p className="text-gray-600 mt-2 max-w-3xl">
          Sama veloitus yhdelle tai monelle, esimerkiksi jäsenmaksu kaikille. Jokaiselle
          vastaanottajalle tulee oma luonnos, jonka voi vielä tarkistaa ennen lähettämistä.
          Lentolaskut tehdään laskutusjaksosta.
        </p>
      </div>
      <NewInvoiceForm recipients={recipients} presets={invoicePresets()} />
    </div>
  );
}
