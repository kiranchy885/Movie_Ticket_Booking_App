import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

const AdminProfile = () => {
  const navigate = useNavigate();

  // Safe local state initialization from localStorage
  const [admin, setAdmin] = useState(() => {
    try {
      const userStr = localStorage.getItem("adminUser");
      return userStr ? JSON.parse(userStr) : { name: "Admin", email: "admin@example.com", role: "admin" };
    } catch (e) {
      return { name: "Admin", email: "admin@example.com", role: "admin" };
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(admin?.name || "");
  const [email, setEmail] = useState(admin?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (admin) {
      setName(admin.name || "");
      setEmail(admin.email || "");
    }
  }, [admin]);

  const toggleEdit = () => {
    if (isEditing) {
      setName(admin?.name || "");
      setEmail(admin?.email || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!name.trim()) return toast.error("Name is required");
    if (!email.trim() || !email.includes("@")) return toast.error("Valid email required");

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
      const currentToken = localStorage.getItem("adminToken");
      
      const response = await fetch("http://localhost:5000/admin/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update profile.");
      }

      const updatedAdminInfo = data.admin || data.user;
      if (updatedAdminInfo) {
        setAdmin(updatedAdminInfo);
        localStorage.setItem("adminUser", JSON.stringify(updatedAdminInfo));
      }

      toast.success("Admin profile updated successfully!");
      setIsEditing(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      console.error("Update error:", err);
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 text-white">
      {/* Go Back Button */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition text-sm font-medium cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-8">Admin Profile</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
        {/* Avatar Header */}
        <div className="flex items-center gap-5 mb-8">
          <div className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center text-3xl font-bold">
            {admin?.name?.charAt(0).toUpperCase() || "A"}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{admin?.name || "Admin User"}</h2>
            <p className="text-gray-400">{admin?.email || "No email found"}</p>
          </div>
        </div>

        {!isEditing ? (
          <>
            <div className="space-y-5">
              <div>
                <p className="text-sm text-gray-400">Full Name</p>
                <p className="mt-1">{admin?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="mt-1">{admin?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Account Type</p>
                <p className="mt-1 capitalize">{admin?.role || "Admin"}</p>
              </div>
            </div>
            <button
              onClick={toggleEdit}
              className="mt-6 px-6 py-2 bg-primary hover:bg-primary/85 rounded-lg font-semibold transition cursor-pointer"
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
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div className="border-t border-gray-800 pt-4 mt-4">
              <p className="text-sm text-gray-400 mb-3">
                Leave password fields empty to keep current password.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-primary hover:bg-primary/85 disabled:opacity-50 rounded-lg font-semibold transition cursor-pointer"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={toggleEdit}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminProfile;