import React from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.svg";

const AdminNavbar = () => {
  return (
    <nav className="w-full h-16 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-6">
      <Link to="/" className="flex items-center">
        <img
          src={logo}
          alt="Logo"
          className="h-10 w-auto"
          onError={(e) => {
            console.log("Logo failed to load");
            e.target.style.display = "none";
          }}
        />
        <span className="ml-3 text-white text-xl font-bold">
          Admin Panel
        </span>
      </Link>
    </nav>
  );
};

export default AdminNavbar;