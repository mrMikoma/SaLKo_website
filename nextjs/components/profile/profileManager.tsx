"use client";

import { useState } from "react";
import UserInfo from "./userInfo";
import ProfileEditForm from "./profileEditForm";
import { UserData } from "@/utilities/definitions";

interface ProfileManagerProps {
  user: UserData;
}

const ProfileManager = ({ user }: ProfileManagerProps) => {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Muokkaa profiilia</h2>
        </div>
        <div className="p-6">
          <ProfileEditForm
            user={user}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6">
        <div className="flex items-center space-x-4">
          <div className="bg-white rounded-full p-3">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{user.full_name}</h2>
            <p className="text-blue-100">{user.email}</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <UserInfo
          name={user.name}
          full_name={user.full_name}
          email={user.email}
          role={user.role}
          address={user.address || ""}
          city={user.city || ""}
          postalCode={user.postalCode || ""}
          phone={user.phone || ""}
        />
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => setIsEditing(true)}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Muokkaa tietoja
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileManager;
