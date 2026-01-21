"use client";

import { useState } from "react";
import { User } from "@/utilities/adminUserActions";
import CreateUserForm from "./users/CreateUserForm";
import UserTableRow from "./users/UserTableRow";

interface UserTableProps {
  users: User[];
}

const UserTable = ({ users }: UserTableProps) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleSuccess = (message: string) => {
    setSuccess(message);
    setError(null);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setSuccess(null);
  };

  const handleCreateSuccess = () => {
    handleSuccess("Käyttäjä luotu onnistuneesti");
    setShowCreateForm(false);
  };

  return (
    <div>
      {error && (
        <div className="mx-6 mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right font-bold"
          >
            &times;
          </button>
        </div>
      )}
      {success && (
        <div className="mx-6 mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Create User Button and Form */}
      <div className="mx-6 my-4">
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            + Luo uusi käyttäjä
          </button>
        ) : (
          <CreateUserForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateForm(false)}
            onError={handleError}
          />
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nimi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sähköposti
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rooli
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Auth
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Puhelin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Liittynyt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Viimeisin kirjautuminen
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Toiminnot
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <UserTableRow
                key={user.id}
                user={user}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500">Ei käyttäjiä</div>
        )}
      </div>
    </div>
  );
};

export default UserTable;
