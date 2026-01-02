export const dynamic = "force-dynamic";
import ProfileManager from "@/components/profile/profileManager";
import { getUserData } from "@/utilities/user";
import { isProfileComplete } from "@/utilities/userManagement";
import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";

export const metadata = {
  title: "Profiili | SaLKo",
  description: "Hallinnoi käyttäjäprofiiliasi",
};

export default async function Page() {
  const user = await getUserData();
  const profileComplete = user ? await isProfileComplete() : false;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col w-full">
        <PageHero
          title="Käyttäjätietoja ei löytynyt"
          subtitle="Kirjaudu sisään nähdäksesi profiilisi"
          breadcrumbs={["Profiili"]}
          backgroundImage="bg-punkaharju-one"
          showScrollIndicator={false}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Profiili"
        subtitle={user.full_name}
        breadcrumbs={["Profiili"]}
        backgroundImage="bg-punkaharju-one"
        compact={true}
        showScrollIndicator={false}
      />

      <ContentSection variant="dark" containerSize="default">
        <div className="max-w-4xl mx-auto space-y-6 -mt-16">
          {!profileComplete && (
            <div className="glass rounded-xl p-5 border-2 border-warning-amber/50 bg-warning-amber/10">
              <div className="flex items-start gap-4">
                <svg
                  className="w-6 h-6 text-warning-amber flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <h3 className="text-warning-amber font-bold text-lg mb-1">
                    Käyttäjätietosi ovat keskeneräiset
                  </h3>
                  <p className="text-swhite/90 font-medium">
                    Täydennä puuttuvat tietosi käyttäjätietosi!
                  </p>
                </div>
              </div>
            </div>
          )}
          <ProfileManager user={user} />
        </div>
      </ContentSection>
    </div>
  );
}
