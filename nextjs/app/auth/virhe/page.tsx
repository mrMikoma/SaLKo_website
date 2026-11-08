import Link from "next/link";
import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";
import Login from "@/components/auth/login";
import ErrorPanel, { secondaryAction } from "@/components/errors/ErrorPanel";
import { WORKSPACE_DOMAIN } from "@/utilities/googleWorkspace";

export const metadata = {
  title: "Kirjautuminen ei onnistunut",
  robots: { index: false, follow: false },
};

// Auth.js's ?error= (auth.ts, pages.error), and Unavailable from the signIn
// callback when the database failed
const EXPLANATION: Record<string, { title: string; text: string; login: boolean }> = {
  AccessDenied: {
    title: "Kirjautuminen estetty",
    text: `Google-kirjautuminen toimii vain kerhon @${WORKSPACE_DOMAIN}-tunnuksilla. Jos kirjauduit kerhon tunnuksella, se on voitu poistaa käytöstä: ota yhteyttä ylläpitoon. Voit myös kirjautua sähköpostilla ja salasanalla.`,
    login: true,
  },
  Unavailable: {
    title: "Kirjautuminen ei juuri nyt onnistu",
    text: "Palvelussa on häiriö. Yritä hetken kuluttua uudelleen.",
    login: false,
  },
  Verification: {
    title: "Linkki on vanhentunut",
    text: "Kirjautumislinkki on jo käytetty tai vanhentunut. Kirjaudu uudelleen.",
    login: true,
  },
};

const FALLBACK = {
  title: "Kirjautuminen ei onnistunut",
  text: "Yritä uudelleen. Jos virhe toistuu, ota yhteyttä ylläpitoon.",
  login: true,
};

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

/** Where Auth.js sends a login it refused or that failed: why, and a way on */
export default async function Page({ searchParams }: PageProps) {
  const { error } = await searchParams;
  const explanation = (error && EXPLANATION[error]) || FALLBACK;

  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero title={explanation.title} backgroundImage="punkaharju" compact={true} showScrollIndicator={false} />
      <ContentSection variant="dark" containerSize="default">
        <div className="max-w-lg mx-auto space-y-6">
          <ErrorPanel
            tone="dark"
            actions={
              <>
                <Link href="/" className={secondaryAction("dark")}>
                  Etusivulle
                </Link>
                <Link href="/yhteystiedot" className={secondaryAction("dark")}>
                  Yhteystiedot
                </Link>
              </>
            }
          >
            <p>{explanation.text}</p>
          </ErrorPanel>
          {explanation.login && (
            <div className="glass rounded-2xl border-2 border-sred/30 shadow-2xl">
              <Login />
            </div>
          )}
        </div>
      </ContentSection>
    </div>
  );
}
