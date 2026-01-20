"use client";

import { useState } from "react";
import UserInfo from "./userInfo";
import ProfileEditForm from "./profileEditForm";
import ChangePasswordForm from "./changePasswordForm";
import { UserData } from "@/utilities/definitions";

interface ProfileManagerProps {
  user: UserData;
}

const ProfileManager = ({ user }: ProfileManagerProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (isChangingPassword) {
    return (
      <div className="glass rounded-2xl shadow-2xl overflow-hidden border-2 border-sred/30">
        <div className="bg-gradient-to-r from-sblue to-sblued px-6 py-5 border-b-2 border-sred/30">
          <h2 className="text-2xl font-bold text-swhite">Vaihda salasana</h2>
        </div>
        <div className="p-6">
          <ChangePasswordForm
            onCancel={() => setIsChangingPassword(false)}
          />
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="glass rounded-2xl shadow-2xl overflow-hidden border-2 border-sred/30">
        <div className="bg-gradient-to-r from-sblue to-sblued px-6 py-5 border-b-2 border-sred/30">
          <h2 className="text-2xl font-bold text-swhite">Muokkaa profiilia</h2>
        </div>
        <div className="p-6">
          <ProfileEditForm user={user} onCancel={() => setIsEditing(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl shadow-2xl overflow-hidden border-2 border-sred/30">
      <div className="bg-gradient-to-r from-sblue to-sblued px-6 py-6 border-b-2 border-sred/30">
        <div className="flex items-center space-x-4">
          <div className="bg-swhite/95 rounded-full p-3 shadow-lg">
            <svg
              className="w-12 h-12 text-sblue"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl md:text-3xl font-bold text-swhite">
              {user.full_name}
            </h2>
            <p className="text-sbluel text-sm md:text-base font-medium break-all">
              {user.email}
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <UserInfo
          name={user.name}
          full_name={user.full_name}
          email={user.email}
          roles={user.roles}
          address={user.address || ""}
          city={user.city || ""}
          postalCode={user.postalCode || ""}
          phone={user.phone || ""}
        />
        <div className="mt-6 pt-6 border-t-2 border-swhite/10">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setIsEditing(true)}
              className="w-full sm:w-auto bg-sred text-swhite px-6 py-3 rounded-lg hover:bg-sred/90 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 font-bold shadow-xl border-2 border-transparent hover:border-sred/50"
            >
              <svg
                className="w-5 h-5 inline mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Muokkaa tietoja
            </button>
            {user.auth_provider === "credentials" && (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="w-full sm:w-auto bg-sblue text-swhite px-6 py-3 rounded-lg hover:bg-sblue/90 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 font-bold shadow-xl border-2 border-transparent hover:border-sblue/50"
              >
                <svg
                  className="w-5 h-5 inline mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                Vaihda salasana
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileManager;
