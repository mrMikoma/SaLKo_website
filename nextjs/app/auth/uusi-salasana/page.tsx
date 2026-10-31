import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";
import ResetPasswordForm from "@/components/auth/resetPasswordForm";

export const metadata = {
  title: "Uusi salasana",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

/**
 * Where a password reset link made by an admin leads. Anyone with the link
 * can set the password, once, within a day.
 */
export default async function Page({ searchParams }: PageProps) {
  const { token } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Uusi salasana"
        backgroundImage="punkaharju"
        compact={true}
        showScrollIndicator={false}
      />
      <ContentSection variant="dark" containerSize="default">
        <div className="max-w-md mx-auto">
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <p className="text-swhite">
              Linkistä puuttuu tunniste. Pyydä uusi salasanan vaihtolinkki
              ylläpitäjältä.
            </p>
          )}
        </div>
      </ContentSection>
    </div>
  );
}
