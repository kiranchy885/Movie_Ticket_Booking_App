import React from "react";
import Title from "../components/admin/Title";
import { useAuth } from "../context/AuthContext";

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-black text-white px-6 pt-28">

      <div className="max-w-2xl mx-auto">

        <h1 className="text-3xl font-bold mb-8">
          My Account
        </h1>

        <div className="bg-primary/10 border border-primary/20 rounded-xl p-6">

          <div className="flex items-center gap-5 mb-8">

            <div className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center text-3xl font-bold overflow-hidden">

              {user?.image ? (
                <img
                  src={user.image}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}

            </div>

            <div>
              <h2 className="text-xl font-semibold">
                {user?.name || "User"}
              </h2>

              <p className="text-gray-400">
                {user?.email || "No email"}
              </p>
            </div>

          </div>

          <div className="space-y-5">

            <div>
              <p className="text-sm text-gray-400">
                Full Name
              </p>

              <p className="mt-1">
                {user?.name || "Not available"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-400">
                Email
              </p>

              <p className="mt-1">
                {user?.email || "Not available"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-400">
                Account Type
              </p>

              <p className="mt-1 capitalize">
                {user?.role || "User"}
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default Profile;