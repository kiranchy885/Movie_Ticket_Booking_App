import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Film,
    Ticket,
    Users,
    PlusCircle,
    List,
    Calendar,
    UserCog,
    Settings,
    LogOut,
    BarChart3,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
    const location = useLocation();
    const { logoutAdmin } = useAuth();

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        if (logoutAdmin) logoutAdmin();
    };

    return (
        <aside className="w-64 bg-gray-900 min-h-screen p-4 border-r border-gray-700 flex flex-col">

            {/* Logo */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">
                    Quick<span className="text-primary">Show</span>
                </h1>

                <p className="text-gray-400 text-sm">
                    Admin Panel
                </p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1">

                {/* Dashboard */}
                <Link
                    to="/admin"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition ${
                        isActive("/admin")
                            ? "bg-primary/20 text-primary"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                >
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </Link>

                {/* Add Show */}
                <Link
                    to="/admin/add-show"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition ${
                        isActive("/admin/add-show")
                            ? "bg-primary/20 text-primary"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                >
                    <PlusCircle size={20} />
                    <span>Add Show</span>
                </Link>

                {/* List Shows */}
                <Link
                    to="/admin/list-shows"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition ${
                        isActive("/admin/list-shows")
                            ? "bg-primary/20 text-primary"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                >
                    <List size={20} />
                    <span>List Shows</span>
                </Link>

                {/* Bookings */}
                <Link
                    to="/admin/list-bookings"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition ${
                        isActive("/admin/list-bookings")
                            ? "bg-primary/20 text-primary"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                >
                    <Ticket size={20} />
                    <span>Bookings</span>
                </Link>

                {/* Users */}
                <Link
                    to="/admin/users"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition ${
                        isActive("/admin/users")
                            ? "bg-primary/20 text-primary"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                >
                    <Users size={20} />
                    <span>Users</span>
                </Link>

                {/* Result Analysis */}
                <Link
                    to="/admin/result-analysis"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition ${
                        isActive("/admin/result-analysis")
                            ? "bg-primary/20 text-primary"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                >
                    <BarChart3 size={20} />
                    <span>Result Analysis</span>
                </Link>

                <hr className="border-gray-700 my-4" />

                {/* Update Profile */}
                <Link
                    to="/adminProfile"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition ${
                        isActive("/adminProfile")
                            ? "bg-primary/20 text-primary"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                >
                    <UserCog size={20} />
                    <span>Update Profile</span>
                </Link>

                {/* Settings */}
                <Link
                    to="/admin/settings"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition ${
                        isActive("/admin/settings")
                            ? "bg-primary/20 text-primary"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                >
                    <Settings size={20} />
                    <span>Settings</span>
                </Link>

            </nav>

            {/* Logout */}
            <div className="border-t border-gray-700 pt-4">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
                >
                    <LogOut size={20} />
                    <span>Sign Out</span>
                </button>
            </div>

        </aside>
    );
};

export default AdminNavbar;