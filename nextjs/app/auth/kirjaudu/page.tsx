import { redirect } from "next/navigation";
import { auth } from "@/auth";
import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";
import Login from "@/components/auth/login";
import { returnPath } from "@/utilities/safeRedirect";

export const metadata = {
  title: "Kirjaudu sisään",
  robots: { index: false, follow: false },
};

// What Auth.js's ?error= means here: a Google login that was cancelled or
// failed comes back to the login page (auth.ts, pages.signIn)
const ERROR_TEXT: Record<string, string> = {
  OAuthCallbackError: "Google-kirjautuminen keskeytyi tai ei onnistunut. Yritä uudelleen.",
  OAuthSignInError: "Google-kirjautumisen aloitus ei onnistunut. Yritä uudelleen.",
  OAuthAccountNotLinked: "Tällä sähköpostiosoitteella on jo tunnus. Kirjaudu salasanalla tai ota yhteyttä ylläpitoon.",
  AccountNotLinked: "Tällä sähköpostiosoitteella on jo tunnus. Kirjaudu salasanalla tai ota yhteyttä ylläpitoon.",
  CredentialsSignin: "Virheellinen sähköpostiosoite tai salasana.",
  MissingCSRF: "Kirjautumislomake vanheni. Yritä uudelleen.",
};

interface PageProps {
  searchParams: Promise<{ paluu?: string; callbackUrl?: string; error?: string; hairio?: string }>;
}

/**
 * The login as a page of its own: where proxy.ts sends a visitor who isn't
 * logged in from a member or admin page (?paluu= is where they were going),
 * and where Auth.js sends a Google login that failed. After logging in, the
 * member goes on to that page.
 */
export default async function Page({ searchParams }: PageProps) {
  const { paluu, callbackUrl, error, hairio } = await searchParams;
  const target = returnPath(paluu ?? callbackUrl);

  const session = await auth();
  if (session?.user?.id) redirect(target);

  // From proxy.ts while the database is down: the session couldn't be checked
  const notice = hairio
    ? "Palvelussa on häiriö, eikä jäsenalue juuri nyt avaudu. Yritä hetken kuluttua uudelleen; olet todennäköisesti yhä kirjautuneena."
    : error
      ? (ERROR_TEXT[error] ?? "Kirjautuminen ei onnistunut. Yritä uudelleen.")
      : null;

  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Kirjaudu sisään"
        subtitle={target !== "/" && !notice ? "Sivu on vain jäsenille. Kirjaudu sisään jatkaaksesi." : undefined}
        backgroundImage="punkaharju"
        compact={true}
        showScrollIndicator={false}
      />
      <ContentSection variant="dark" containerSize="default">
        <div className="max-w-lg mx-auto glass rounded-2xl border-2 border-sred/30 shadow-2xl">
          {notice && (
            <p role="alert" className="mx-6 mt-6 rounded-lg border border-sred/50 bg-sred/10 p-3 text-center font-medium text-swhite">
              {notice}
            </p>
          )}
          <Login redirectTo={target} />
        </div>
      </ContentSection>
    </div>
  );
}
