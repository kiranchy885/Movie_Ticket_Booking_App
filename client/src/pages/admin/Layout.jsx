import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, PlusSquare, List, CalendarCheck, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const Layout = () => {

    const { user, logout } = useAuth();
    const navigate = useNavigate();


    const handleLogout = () => {

        logout();

        navigate("/login");

    };


    return (
        <div className="min-h-screen bg-black text-white flex">

            {/* ========================= */}
            {/* SIDEBAR */}
            {/* ========================= */}

            <aside className="w-64 bg-gray-900 border-r border-gray-800 min-h-screen flex flex-col">

                {/* Logo / Title */}

                <div className="p-6 border-b border-gray-800">

                    <h1 className="text-xl font-bold">
                        QuickShow
                    </h1>

                    <p className="text-sm text-gray-400 mt-1">
                        Admin Panel
                    </p>

                </div>


                {/* Admin information */}

                <div className="p-5 border-b border-gray-800">

                    <p className="text-sm text-gray-400">
                        Logged in as
                    </p>

                    <p className="font-medium mt-1 truncate">
                        {user?.name || "Admin"}
                    </p>

                    <p className="text-xs text-gray-500 truncate mt-1">
                        {user?.email}
                    </p>

                </div>


                {/* ========================= */}
                {/* NAVIGATION */}
                {/* ========================= */}

                <nav className="flex-1 p-4 space-y-2">

                    <NavLink
                        to="/admin"
                        end
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                                isActive
                                    ? "bg-primary text-white"
                                    : "text-gray-300 hover:bg-gray-800"
                            }`
                        }
                    >

                        <LayoutDashboard size={18} />

                        <span>
                            Dashboard
                        </span>

                    </NavLink>


                    <NavLink
                        to="/admin/add-shows"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                                isActive
                                    ? "bg-primary text-white"
                                    : "text-gray-300 hover:bg-gray-800"
                            }`
                        }
                    >

                        <PlusSquare size={18} />

                        <span>
                            Add Shows
                        </span>

                    </NavLink>


                    <NavLink
                        to="/admin/list-shows"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                                isActive
                                    ? "bg-primary text-white"
                                    : "text-gray-300 hover:bg-gray-800"
                            }`
                        }
                    >

                        <List size={18} />

                        <span>
                            List Shows
                        </span>

                    </NavLink>


                    <NavLink
                        to="/admin/list-bookings"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                                isActive
                                    ? "bg-primary text-white"
                                    : "text-gray-300 hover:bg-gray-800"
                            }`
                        }
                    >

                        <CalendarCheck size={18} />

                        <span>
                            List Bookings
                        </span>

                    </NavLink>

                </nav>


                {/* ========================= */}
                {/* LOGOUT */}
                {/* ========================= */}

                <div className="p-4 border-t border-gray-800">

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition"
                    >

                        <LogOut size={18} />

                        <span>
                            Logout
                        </span>

                    </button>

                </div>

            </aside>


            {/* ========================= */}
            {/* MAIN CONTENT */}
            {/* ========================= */}

            <main className="flex-1 min-w-0">

                <div className="p-6">

                    <Outlet />

                </div>

            </main>

        </div>
    );
};


export default Layout;