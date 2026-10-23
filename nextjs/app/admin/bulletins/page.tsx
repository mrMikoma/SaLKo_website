export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { redirect } from "next/navigation";
import { fetchAllBulletinsForAdmin } from "@/utilities/bulletings";
import BulletinTable from "@/components/admin/bulletinTable";

export default async function BulletinsPage() {
  const session = await auth();

  if (
    !session?.user?.roles ||
    !hasPermission(session.user.roles, "MANAGE_BULLETINS")
  ) {
    redirect("/");
  }

  const { result: bulletins } = await fetchAllBulletinsForAdmin();
  const published = bulletins.filter((b) => b.status === "published").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tiedotteet</h1>
        <p className="text-gray-600 mt-2">
          Hallinnoi etusivulla näkyviä tiedotteita
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Kaikki tiedotteet
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Uusi tiedote on luonnos, kunnes julkaiset sen. Etusivulla
                näkyy 5 uusinta julkaistua, kaikki sivulla /tiedotteet.
              </p>
            </div>
            <span className="self-start whitespace-nowrap bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">
              {published} julkaistu · {bulletins.length - published} luonnosta
            </span>
          </div>
        </div>
        <BulletinTable bulletins={bulletins} />
      </div>
    </div>
  );
}
