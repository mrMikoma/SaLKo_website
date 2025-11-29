export const dynamic = "force-dynamic";
import ProfileManager from "@/components/profile/profileManager";
import { getUserData } from "@/utilities/user";
import { isProfileComplete } from "@/utilities/userManagement";

export default async function Page() {
  const user = await getUserData();
  const profileComplete = user ? await isProfileComplete() : false;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col w-full">
        <section className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center bg-olavinlinna-one">
          <div className="absolute inset-0 bg-gradient-to-b from-sblack/50 via-sblack/40 to-sblued/95"></div>
          <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 pt-48 pb-16 flex flex-col items-center justify-center">
            <div className="text-center space-y-6 animate-fade-in">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-swhite">
                Käyttäjätietoja ei löytynyt
              </h1>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full">
      <section className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center bg-olavinlinna-one">
        <div className="absolute inset-0 bg-gradient-to-b from-sblack/50 via-sblack/40 to-sblued/95"></div>
        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 pt-48 pb-16 flex flex-col items-center justify-center">
          <div className="w-full space-y-6">
            {!profileComplete && (
              <div className="bg-yellow-500 text-gray-900 px-6 py-3 rounded-lg mb-4 text-center">
                <p className="text-sm font-medium">
                  Täydennä profiilisi tiedot varauksia varten
                </p>
              </div>
            )}
            <ProfileManager user={user} />
          </div>
        </div>
      </section>
    </div>
  );
}
