import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../../components/admin/Sidebar"; // ✅ Corrected path to components folder
import { useAuth } from "../../context/AuthContext";

const Layout = () => {
    const { admin } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-black text-white flex">
            {/* SIDEBAR COMPONENT */}
            <Sidebar />

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 min-w-0 bg-black flex flex-col">
                {/* Optional Top bar showing logged-in admin identity */}
                <header className="h-16 border-b border-gray-800 px-8 flex items-center justify-end bg-gray-900/40 backdrop-blur-md">
                    <div className="text-right">
                        <p className="text-sm font-medium text-white">{admin?.name || "Admin User"}</p>
                        <p className="text-xs text-gray-400">{admin?.email || "admin@quickshow.com"}</p>
                    </div>
                </header>

                <div className="p-8 flex-1">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;