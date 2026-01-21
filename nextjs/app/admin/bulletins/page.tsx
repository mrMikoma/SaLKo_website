export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { redirect } from "next/navigation";
import { fetchAllBulletings } from "@/utilities/bulletings";
import BulletinTable from "@/components/admin/bulletinTable";

export default async function BulletinsPage() {
  const session = await auth();

  if (
    !session?.user?.roles ||
    !hasPermission(session.user.roles, "ACCESS_ADMIN_SITE")
  ) {
    redirect("/");
  }

  const bulletinsResponse = await fetchAllBulletings();
  const bulletins = bulletinsResponse.result || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tiedotteet</h1>
        <p className="text-gray-600 mt-2">
          Hallinnoi etusivulla näkyviä tiedotteita
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Kaikki tiedotteet
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Etusivulla näytetään 5 uusinta tiedotetta
              </p>
            </div>
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
              {bulletins.length} tiedotetta
            </span>
          </div>
        </div>
        <BulletinTable bulletins={bulletins} />
      </div>
    </div>
  );
}
