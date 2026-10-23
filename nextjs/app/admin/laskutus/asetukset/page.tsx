export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DateTime } from "luxon";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isFlightLogEnabled } from "@/utilities/features";
import { SHEET_ZONE } from "@/utilities/flightSheetParser";
import { getBillingSettings } from "@/utilities/billingData";
import { getMailOverview } from "@/utilities/mailData";
import MailStatus from "@/components/mail/MailStatus";
import {
  EquipmentFees,
  FreeHour,
  PurposePayers,
  Rates,
} from "@/components/billing/BillingSettingsForms";

export const metadata = {
  title: "Laskutuksen asetukset | Ylläpito",
};

interface PageProps {
  searchParams: Promise<{ kausi?: string }>;
}

export default async function BillingSettingsPage({ searchParams }: PageProps) {
  if (!isFlightLogEnabled()) {
    notFound();
  }
  const session = await auth();
  if (!session?.user?.roles || !hasPermission(session.user.roles, "MANAGE_BILLING")) {
    redirect("/");
  }

  const thisYear = DateTime.now().setZone(SHEET_ZONE).year;
  const requested = Number((await searchParams).kausi);
  const season = Number.isInteger(requested) && requested >= 2000 && requested <= 2100 ? requested : thisYear;
  const settings = await getBillingSettings(season);

  const card = "bg-white rounded-lg shadow p-6 space-y-4 text-gray-900";
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/laskutus" className="text-sm text-sblue hover:underline">
          ← Laskutus
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-1">Laskutuksen asetukset</h1>
        <p className="text-gray-600 mt-2 max-w-3xl">
          Muutokset vaikuttavat avoimiin jaksoihin heti; suljettujen jaksojen laskut pysyvät
          sellaisina kuin ne laskutettiin. Hinnasto-sivun hinnat ovat erikseen tiedostossa
          data/prices.json.
        </p>
      </div>

      <section className={card}>
        <h2 className="text-xl font-semibold">Minuuttihinnat</h2>
        <p className="text-sm text-gray-600">
          Lennon päivänä voimassa ollut hinta. Koululennot laskutetaan alemmalla hinnalla:
          oppilaat on vapautettu kalustomaksusta tarkastuslentoon asti. Yksittäinen
          paikallislento (lähtö- ja laskupaikka samat) laskutetaan vähintään minimin
          mittaisena; saman lentäjän peräkkäisille lennoille ja matkalennoille minimiä ei ole.
        </p>
        <Rates aircraft={settings.aircraft} rates={settings.rates} />
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Kalustomaksu, kausi {season}</h2>
          <nav className="flex gap-2" aria-label="Kausi">
            {[season - 1, season + 1].map((year) => (
              <Link
                key={year}
                href={`/admin/laskutus/asetukset?kausi=${year}`}
                className="min-h-11 inline-flex items-center px-3 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50"
              >
                {year < season ? `← ${year}` : `${year} →`}
              </Link>
            ))}
          </nav>
        </div>
        <p className="text-sm text-gray-600">
          Kalustomaksun maksaneet lentävät alemmalla hinnalla ja saavat vapaatunnin.
        </p>
        <EquipmentFees key={season} season={season} members={settings.members} />
      </section>

      <section className={card}>
        <h2 className="text-xl font-semibold">Vapaatunti</h2>
        <p className="text-sm text-gray-600">
          Kalustomaksun maksaneille, kalenterivuosittain: jokaisten maksettujen minuuttien
          jälkeen seuraavat minuutit ovat ilmaisia (hinnaston mukaan 10 h + 1 h, eli 600 + 60).
          Näkyy laskussa hyvitysrivinä.
        </p>
        <FreeHour aircraft={settings.aircraft} freeHour={settings.freeHour} />
      </section>

      <section className={card}>
        <h2 className="text-xl font-semibold">Kuka maksaa</h2>
        <PurposePayers purposes={settings.purposes} />
      </section>

      <section className={card}>
        <h2 className="text-xl font-semibold">Sähköposti</h2>
        <MailStatus overview={getMailOverview()} />
        <Link href="/admin/laskutus/viestit" className="inline-block text-sblue hover:underline">
          Lähetetyt viestit ja testiviesti
        </Link>
      </section>
    </div>
  );
}
