export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { redirect } from "next/navigation";
import { fetchAllBulletings } from "@/utilities/bulletings";
import BulletinTable from "@/components/admin/bulletinTable";

export default async function BulletinsAdminPage() {
  const session = await auth();

  if (
    !session?.user?.role ||
    !hasPermission(session.user.role, "ACCESS_ADMIN_SITE")
  ) {
    redirect("/");
  }

  const { result: bulletins } = await fetchAllBulletings();

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Tiedotteet</h2>
            <p className="mt-1 text-sm text-gray-500">
              Etusivulla näytetään 5 uusinta tiedotetta. Tiedotteet tukevat
              Markdown-muotoilua (lihavointi, listat, otsikot jne.).
            </p>
          </div>
          {bulletins && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {bulletins.length} tiedotetta
            </span>
          )}
        </div>
      </div>
      <BulletinTable bulletins={bulletins ?? []} />
    </div>
  );
}
