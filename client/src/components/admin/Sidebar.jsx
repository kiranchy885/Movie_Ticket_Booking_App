import React from "react";
import { Link, useLocation } from "react-router-dom";

import {
    LayoutDashboard,
    Ticket,
    Users,
    PlusCircle,
    Film,
    List,
    UserCog,
    LogOut,
    BarChart3,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

const Sidebar = () => {

    const location = useLocation();

    const { logoutAdmin } = useAuth();

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        if (logoutAdmin) logoutAdmin();
    };

    return (
        <aside className="w-64 bg-gray-900 min-h-screen p-4 border-r border-gray-800 flex flex-col shrink-0">

            {/* Logo */}
            <div className="mb-8 p-2">

                <h1 className="text-2xl font-bold text-white">
                    Quick<span className="text-primary">Show</span>
                </h1>

                <p className="text-gray-400 text-xs mt-1 uppercase tracking-wider">
                    Admin Panel
                </p>

            </div>


            {/* Navigation */}
            <nav className="flex-1 space-y-1">

                {/* Dashboard */}
                <Link
                    to="/admin"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition text-sm font-medium ${
                        isActive("/admin")
                            ? "bg-primary text-white shadow-md"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                >
                    <LayoutDashboard size={18} />

                    <span>
                        Dashboard
                    </span>
                </Link>


                {/* ================================================= */}
                {/* ADD MOVIE (NEW) */}
                {/* ================================================= */}

                <Link
                    to="/admin/add-movie"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition text-sm font-medium ${
                        isActive("/admin/add-movie")
                            ? "bg-primary text-white shadow-md"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                >
                    <Film size={18} />

                    <span>
                        Add Movie
                    </span>
                </Link>


                {/* Add Shows */}
                <Link
                    to="/admin/add-shows"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition text-sm font-medium ${
                        isActive("/admin/add-shows")
                            ? "bg-primary text-white shadow-md"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                >
                    <PlusCircle size={18} />

                    <span>
                        Add Shows
                    </span>
                </Link>


                {/* List Shows */}
                <Link
                    to="/admin/list-shows"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition text-sm font-medium ${
                        isActive("/admin/list-shows")
                            ? "bg-primary text-white shadow-md"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                >
                    <List size={18} />

                    <span>
                        List Shows
                    </span>
                </Link>


                {/* Bookings */}
                <Link
                    to="/admin/list-bookings"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition text-sm font-medium ${
                        isActive("/admin/list-bookings")
                            ? "bg-primary text-white shadow-md"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                >
                    <Ticket size={18} />

                    <span>
                        Bookings
                    </span>
                </Link>


                {/* Result Analysis */}
                <Link
                    to="/admin/result-analysis"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition text-sm font-medium ${
                        isActive("/admin/result-analysis")
                            ? "bg-primary text-white shadow-md"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                >
                    <BarChart3 size={18} />

                    <span>
                        Result Analysis
                    </span>
                </Link>


                <hr className="border-gray-800 my-4" />


                {/* Admin Profile Route */}
                <Link
                    to="/admin/profile"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition text-sm font-medium ${
                        isActive("/admin/profile")
                            ? "bg-primary text-white shadow-md"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                >
                    <UserCog size={18} />

                    <span>
                        Update Profile
                    </span>
                </Link>

            </nav>


            {/* Logout */}
            <div className="border-t border-gray-800 pt-4">

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition text-sm font-medium cursor-pointer"
                >
                    <LogOut size={18} />

                    <span>
                        Sign Out
                    </span>
                </button>

            </div>

        </aside>
    );
};

export default Sidebar;