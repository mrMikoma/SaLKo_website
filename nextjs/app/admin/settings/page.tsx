export const dynamic = 'force-dynamic';
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.role || !hasPermission(session.user.role, "ACCESS_ADMIN_SITE")) {
    redirect("/");
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Järjestelmän asetukset</h1>
        <p className="text-gray-600 mt-2">Hallinnoi järjestelmän asetuksia</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Järjestelmätiedot</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Järjestelmän versio</span>
              <span className="text-sm text-gray-900">1.0.0</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Ympäristö</span>
              <span className="text-sm text-gray-900">{process.env.NODE_ENV || 'development'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Next.js versio</span>
              <span className="text-sm text-gray-900">16</span>
            </div>
          </div>
        </div>

        {/* Authentication Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Autentikointi</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Google Workspace</span>
              <span className="text-sm">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Käytössä
                </span>
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Workspace-domain</span>
              <span className="text-sm text-gray-900">savonlinnanlentokerho.fi</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Tunnistautuminen</span>
              <span className="text-sm text-gray-900">NextAuth.js</span>
            </div>
          </div>
        </div>

        {/* Database Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tietokanta</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Tyyppi</span>
              <span className="text-sm text-gray-900">PostgreSQL</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Yhteys</span>
              <span className="text-sm">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Aktiivinen
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Application Features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Ominaisuudet</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Käyttäjähallinta</span>
              <span className="text-sm">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Käytössä
                </span>
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Varausjärjestelmä</span>
              <span className="text-sm">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Käytössä
                </span>
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Vierasvaraukset</span>
              <span className="text-sm">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Käytössä
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Ylläpitotoiminnot</h2>
        <p className="text-sm text-gray-600 mb-4">
          Nämä toiminnot ovat kehitteillä ja lisätään tulevissa versioissa.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            disabled
            className="bg-gray-300 text-gray-500 px-4 py-3 rounded-md cursor-not-allowed text-sm font-medium"
          >
            Tyhjennä välimuisti
          </button>
          <button
            disabled
            className="bg-gray-300 text-gray-500 px-4 py-3 rounded-md cursor-not-allowed text-sm font-medium"
          >
            Vie käyttäjätiedot
          </button>
          <button
            disabled
            className="bg-gray-300 text-gray-500 px-4 py-3 rounded-md cursor-not-allowed text-sm font-medium"
          >
            Järjestelmäloki
          </button>
        </div>
      </div>

      {/* Info Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">Tietoa</h3>
            <p className="mt-1 text-sm text-blue-700">
              Asetussivu on perustoiminnallisuudeltaan valmis. Lisäasetuksia ja konfiguraatiomahdollisuuksia lisätään tarpeen mukaan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
