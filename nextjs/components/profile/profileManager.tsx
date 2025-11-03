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
      <div className="bg-white bg-opacity-90 p-6 rounded-lg shadow-lg max-w-2xl">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Muokkaa profiilia</h2>
        <ProfileEditForm
          user={user}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="bg-white bg-opacity-90 p-6 rounded-lg shadow-lg max-w-2xl">
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
      <button
        onClick={() => setIsEditing(true)}
        className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
      >
        Muokkaa tietoja
      </button>
    </div>
  );
};

export default ProfileManager;
