export const dynamic = 'force-dynamic';
import { getAllUsers } from "@/utilities/adminUserActions";
import UserTable from "@/components/admin/userTable";
import UserSearch from "@/components/admin/userSearch";

interface PageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const searchQuery = params.search || "";
  const users = await getAllUsers(searchQuery);

  if (!users) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600">Virhe käyttäjien lataamisessa</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Käyttäjähallinta</h1>
        <p className="text-gray-600 mt-2">Hallinnoi järjestelmän käyttäjiä</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <UserSearch initialSearch={searchQuery} />
        </div>
        <UserTable users={users} />
      </div>
    </div>
  );
}
