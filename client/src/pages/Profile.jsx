import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const Profile = () => {
  const { user, setUser, loading } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync state when user data updates
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  if (loading) {
    return <div className="text-white p-10">Loading profile...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white px-6 pt-28">
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  const toggleEdit = () => {
    if (isEditing) {
      setName(user.name || "");
      setEmail(user.email || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!name.trim()) return toast.error("Name is required");
    if (!email.trim() || !email.includes("@"))
      return toast.error("Valid email required");

    if (newPassword || currentPassword || confirmNewPassword) {
      if (!currentPassword) return toast.error("Current password required");
      if (newPassword.length < 6) return toast.error("New password must be at least 6 characters");
      if (newPassword !== confirmNewPassword) return toast.error("Passwords do not match");
    }

    const payload = { name: name.trim(), email: email.trim() };
    if (currentPassword && newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/user/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      const updatedUser = data.user || { ...user, name: payload.name, email: payload.email };
      if (setUser) setUser(updatedUser);

      toast.success("Profile updated!");
      setIsEditing(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 pt-28">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Account</h1>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          {/* Avatar */}
          <div className="flex items-center gap-5 mb-8">
            <div className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center text-3xl font-bold overflow-hidden">
              {user?.image ? (
                <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase() || "U"
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user?.name}</h2>
              <p className="text-gray-400">{user?.email}</p>
            </div>
          </div>

          {!isEditing ? (
            <>
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-gray-400">Full Name</p>
                  <p className="mt-1">{user.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="mt-1">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Account Type</p>
                  <p className="mt-1 capitalize">{user.role || "User"}</p>
                </div>
              </div>
              <button
                onClick={toggleEdit}
                className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white font-semibold transition"
              >
                Edit Profile
              </button>
            </>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="border-t border-gray-700 pt-4 mt-4">
                <p className="text-sm text-gray-400 mb-3">
                  Leave empty to keep current password.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg text-white font-semibold transition"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={toggleEdit}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;