import Link from "next/link";
import { MyBill } from "@/utilities/billingData";
import { euros } from "@/utilities/billing";
import BillLines from "@/components/billing/BillLines";

/** A member's bills from closed billing periods */
const MyBills = ({ bills }: { bills: MyBill[] }) => {
  if (bills.length === 0) return null;
  return (
    <section className="bg-white rounded-xl shadow-lg overflow-hidden text-gray-900">
      <h2 className="px-4 py-3 bg-gray-50 font-semibold">Laskut</h2>
      <ul className="divide-y divide-gray-200">
        {bills.map((bill) => (
          <li key={bill.periodName} className="px-4 py-3">
            <details>
              <summary className="flex flex-wrap items-center justify-between gap-2 cursor-pointer">
                <span className="font-medium">Jakso {bill.periodName}</span>
                <span className="flex items-center gap-3 tabular-nums">
                  <span className="font-semibold">{euros(bill.totalCents)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      bill.paidAt ? "bg-green-100 text-green-900" : "bg-orange-100 text-orange-900"
                    }`}
                  >
                    {bill.paidAt ? "Maksettu" : "Maksamatta"}
                  </span>
                </span>
              </summary>
              <div className="mt-3 overflow-x-auto">
                <BillLines lines={bill.lines} totalCents={bill.totalCents} />
              </div>
              {bill.invoice && (
                <Link href={`/jasenalue/laskut/${bill.invoice.id}`} className="mt-2 inline-block text-sblue hover:underline">
                  Lasku {bill.invoice.number} ja maksutiedot
                </Link>
              )}
            </details>
          </li>
        ))}
      </ul>
      <p className="px-4 py-3 text-sm text-gray-600 border-t border-gray-200">
        Laskut tulevat sähköpostiisi, ja ne löytyvät myös{" "}
        <Link href="/jasenalue/laskut" className="text-sblue hover:underline">
          Laskut-sivulta
        </Link>
        .
      </p>
    </section>
  );
};

export default MyBills;
