import Link from "next/link";
import PageHero from "@/components/pageHero";
import ErrorPanel, { primaryAction, secondaryAction } from "@/components/errors/ErrorPanel";

export const metadata = {
  title: "Sivua ei löytynyt",
};

/**
 * A mistyped or old address, or something that was removed (an invoice, a
 * bulletin). On every screen size, with ways on to the pages people look for.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero title="Sivua ei löytynyt" backgroundImage="olavinlinna" showScrollIndicator={false}>
        <div className="max-w-[1600px] mx-auto px-6 pb-20 lg:pb-32">
          <div className="max-w-3xl">
            <ErrorPanel
              tone="dark"
              actions={
                <>
                  <Link href="/" className={primaryAction("dark")}>
                    Etusivulle
                  </Link>
                  <Link href="/kalusto/varauskalenteri" className={secondaryAction("dark")}>
                    Varauskalenteri
                  </Link>
                  <Link href="/yhteystiedot" className={secondaryAction("dark")}>
                    Yhteystiedot
                  </Link>
                </>
              }
            >
              <p>
                Osoitteessa ei ole sivua. Se voi olla kirjoitettu väärin, tai sivu on siirretty tai
                poistettu.
              </p>
            </ErrorPanel>
          </div>
        </div>
      </PageHero>
    </div>
  );
}
