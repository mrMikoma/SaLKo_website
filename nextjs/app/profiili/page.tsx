import UserInfo from "@/components/profile/userInfo";
import { getUserData } from "@/utilities/user";

export default async function Page() {
  const user = await getUserData();
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
  } else {
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
                      <UserInfo
                        name={user.name}
                        full_name={user.full_name}
                        email={user.email}
                        role={user.role}
                        address={user.address}
                        city={user.city}
                        postalCode={user.postalCode}
                        phone={user.phone}
                      />
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
}
