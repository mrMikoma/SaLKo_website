import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isBillingEnabled } from "@/utilities/features";
import { getIssuedInvoices, InvoiceStatus } from "@/utilities/invoiceData";
import { csvBody, csvMoney, CsvValue } from "@/utilities/csv";

/**
 * Issued invoices as CSV for the accounting software (utilities/csv.ts): all
 * of them, or one year's (?vuosi=2026).
 */

const STATUS: Record<InvoiceStatus, string> = {
  draft: "luonnos",
  open: "avoin",
  paid: "maksettu",
  cancelled: "mitätöity",
};

export async function GET(request: Request) {
  if (!isBillingEnabled()) {
    return new Response("Not found", { status: 404 });
  }
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user.roles, "MANAGE_BILLING")) {
    return new Response("Forbidden", { status: 403 });
  }
  const requested = Number(new URL(request.url).searchParams.get("vuosi"));
  const year = Number.isInteger(requested) && requested >= 2000 && requested <= 2100 ? requested : null;
  const invoices = await getIssuedInvoices(year);

  const rows: CsvValue[][] = [
    ["Numero", "Päiväys", "Eräpäivä", "Viitenumero", "Vastaanottaja", "Sähköposti", "Otsikko", "Jakso", "Summa €", "Tila", "Maksettu"],
    ...invoices.map((invoice) => [
      invoice.number,
      invoice.issueDate,
      invoice.dueDate,
      invoice.reference,
      invoice.recipientName,
      invoice.recipientEmail,
      invoice.title,
      invoice.periodName,
      csvMoney(invoice.totalCents),
      STATUS[invoice.status],
      invoice.paidAt?.slice(0, 10) ?? null,
    ]),
  ];
  const body = csvBody(rows);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laskut${year ? `-${year}` : ""}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
