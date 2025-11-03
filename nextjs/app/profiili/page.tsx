export const dynamic = 'force-dynamic'
import ProfileManager from "@/components/profile/profileManager";
import { getUserData } from "@/utilities/user";
import { isProfileComplete } from "@/utilities/userManagement";

export default async function Page() {
  const user = await getUserData();
  const profileComplete = user ? await isProfileComplete() : false;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center w-screen">
        <section className="max-w-screen relative">
          <div className="w-screen h-screen flex bg-cover bg-center bg-olavinlinna-one">
            <div className="absolute inset-0 bg-black opacity-50 flex justify-center items-center"></div>
            <div className="absolute inset-x-0 bottom-0 z-10 w-full h-full sm:h-5/6 flex flex-col justify-between">
              <div className="flex flex-col justify-end">
                <div className="text-sm sm:text-md lg:text-lg xl:text-xl text-white font-light text-center text-nowrap mt-10 hidden sm:block">
                  <section className="flex flex-col items-center">
                    <div className="text-white">
                      Käyttäjätietoja ei löytynyt
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center w-screen">
      <section className="max-w-screen relative">
        <div className="w-screen h-screen flex bg-cover bg-center bg-olavinlinna-one">
          <div className="absolute inset-0 bg-black opacity-50 flex justify-center items-center"></div>
          <div className="absolute inset-x-0 bottom-0 z-10 w-full h-full sm:h-5/6 flex flex-col justify-between">
            <div className="flex flex-col justify-end">
              <div className="text-sm sm:text-md lg:text-lg xl:text-xl text-white font-light text-center text-nowrap mt-10 hidden sm:block">
                <section className="flex flex-col items-center">
                  {!profileComplete && (
                    <div className="bg-yellow-500 text-gray-900 px-6 py-3 rounded-lg mb-4 max-w-2xl">
                      <p className="text-sm font-medium">
                        Täydennä profiilisi tiedot varauksia varten
                      </p>
                    </div>
                  )}
                  <ProfileManager user={user} />
                </section>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
