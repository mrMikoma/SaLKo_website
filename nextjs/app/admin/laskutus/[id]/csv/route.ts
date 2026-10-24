import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isBillingEnabled } from "@/utilities/features";
import { getPeriodView } from "@/utilities/billingData";
import type { LineKind } from "@/utilities/billing";
import { csvBody, csvMoney, CsvValue } from "@/utilities/csv";

/**
 * A period as CSV for the accounting software (utilities/csv.ts): every line
 * (default), or one row per payer (?taso=maksajat).
 */

const KIND: Record<LineKind, string> = {
  flight: "lento",
  minimum: "minimilaskutus",
  credit: "hyvitys",
  adjustment: "korjaus",
  unbilled: "ei laskuteta",
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isBillingEnabled()) {
    return new Response("Not found", { status: 404 });
  }
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user.roles, "MANAGE_BILLING")) {
    return new Response("Forbidden", { status: 403 });
  }
  const id = Number((await params).id);
  const view = Number.isInteger(id) ? await getPeriodView(id) : null;
  if (!view) {
    return new Response("Not found", { status: 404 });
  }

  const { period, bill, payers } = view;
  const byPayer = new URL(request.url).searchParams.get("taso") === "maksajat";
  const rows: CsvValue[][] = byPayer
    ? [
        ["Jakso", "Maksaja", "Sähköposti", "Jäsen", "Lentoja", "Minuutit", "Laskuja", "Summa €", "Maksettu"],
        ...bill.payers.map((payer) => [
          period.name,
          payer.name,
          payers[payer.key]?.email ?? null,
          payer.userId ? "kyllä" : "ei",
          payer.flights,
          payer.minutes,
          payer.landings,
          csvMoney(payer.totalCents),
          payers[payer.key]?.paidAt?.slice(0, 10) ?? null,
        ]),
      ]
    : [
        ["Jakso", "Maksaja", "Sähköposti", "Rivi", "Päivä", "Kone", "Tarkoitus", "Selite", "Minuutit", "€/min", "Summa €"],
        ...bill.payers.flatMap((payer) =>
          payer.lines.map((line) => [
            period.name,
            payer.name,
            payers[payer.key]?.email ?? null,
            KIND[line.kind],
            line.flightDate,
            line.registration,
            line.purposeCode,
            line.description,
            line.minutes,
            line.centsPerMinute === null ? null : csvMoney(line.centsPerMinute),
            csvMoney(line.amountCents),
          ])
        ),
      ];

  const body = csvBody(rows);
  const file = `laskutus-${period.name}${byPayer ? "-maksajat" : ""}.csv`.replace(/[^\w.-]/g, "_");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "no-store",
    },
  });
}
