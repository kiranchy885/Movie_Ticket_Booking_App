
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  User,
  Settings,
  Ticket,
  LogOut,
  Plus,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const [showMenu, setShowMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // ==========================================
  // FAVORITES STATE
  // ==========================================

  const [favorites, setFavorites] = useState([]);

  const menuRef = useRef(null);

  // ==========================================
  // LOAD FAVORITES
  // ==========================================

  useEffect(() => {
    const loadFavorites = () => {
      try {
        const savedFavorites = JSON.parse(
          localStorage.getItem("quickshow_favorites") || "[]"
        );

        setFavorites(savedFavorites);
      } catch (error) {
        console.error(
          "Error loading favorites:",
          error
        );

        setFavorites([]);
      }
    };

    // Load favorites when Navbar first opens
    loadFavorites();

    // Listen for favorite changes
    window.addEventListener(
      "favoritesUpdated",
      loadFavorites
    );

    // Also listen for localStorage changes
    window.addEventListener(
      "storage",
      loadFavorites
    );

    return () => {
      window.removeEventListener(
        "favoritesUpdated",
        loadFavorites
      );

      window.removeEventListener(
        "storage",
        loadFavorites
      );
    };
  }, []);

  // ==========================================
  // CLOSE DROPDOWN WHEN CLICKING OUTSIDE
  // ==========================================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // ==========================================
  // SIGN OUT
  // ==========================================

  const handleLogout = () => {
    setShowMenu(false);

    if (logout) {
      logout();
    } else {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }

    navigate("/login");
  };

  // ==========================================
  // USER INFORMATION
  // ==========================================

  const userName =
    user?.name ||
    user?.username ||
    "User";

  const userEmail =
    user?.email ||
    "user@example.com";

  // ==========================================
  // USER INITIAL
  // ==========================================

  const userInitial =
    userName.charAt(0).toUpperCase();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">

      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

        {/* ================================= */}
        {/* LOGO */}
        {/* ================================= */}

        <Link
          to="/"
          className="text-2xl font-bold text-white"
        >
          Quick<span className="text-primary">Show</span>
        </Link>

        {/* ================================= */}
        {/* NAVIGATION */}
        {/* ================================= */}

        <div className="hidden md:flex items-center gap-8 text-sm text-gray-200">

          {/* HOME */}

          <Link
            to="/"
            className="hover:text-primary transition"
          >
            Home
          </Link>

          {/* MOVIES */}

          <Link
            to="/movies"
            className="hover:text-primary transition"
          >
            Movies
          </Link>

          {/* THEATERS */}

          <Link
            to="/theaters"
            className="hover:text-primary transition"
          >
            Theaters
          </Link>

          {/* RELEASES */}

          <Link
            to="/releases"
            className="hover:text-primary transition"
          >
            Releases
          </Link>

          {/* ================================= */}
          {/* FAVORITES */}
          {/* ================================= */}

          {favorites.length > 0 && (
            <Link
              to="/favorite"
              className="hover:text-primary transition"
            >
              Favorites
            </Link>
          )}

        </div>

        {/* ================================= */}
        {/* RIGHT SIDE */}
        {/* ================================= */}

        <div className="flex items-center gap-5">

          {/* ================================= */}
          {/* SEARCH */}
          {/* ================================= */}

          {searchOpen ? (

            <div className="flex items-center gap-2 border border-gray-600 rounded-full px-3 py-1">

              <input
                type="text"
                placeholder="Search movies..."
                className="bg-transparent outline-none text-sm text-white w-32"
                autoFocus
              />

              <X
                size={18}
                className="cursor-pointer text-gray-300 hover:text-white"
                onClick={() =>
                  setSearchOpen(false)
                }
              />

            </div>

          ) : (

            <Search
              size={22}
              className="text-white cursor-pointer hover:text-primary transition"
              onClick={() =>
                setSearchOpen(true)
              }
            />

          )}

          {/* ================================= */}
          {/* USER PROFILE */}
          {/* ================================= */}

          <div
            className="relative"
            ref={menuRef}
          >

            {/* PROFILE BUTTON */}

            <button
              onClick={() =>
                setShowMenu((prev) => !prev)
              }
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden border border-gray-300 hover:scale-105 transition"
            >

              {user?.image ? (

                <img
                  src={user.image}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />

              ) : (

                <span className="text-black font-semibold">
                  {userInitial}
                </span>

              )}

            </button>

            {/* ================================= */}
            {/* DROPDOWN */}
            {/* ================================= */}

            {showMenu && (

              <div className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-2xl overflow-hidden text-gray-800">

                {/* USER HEADER */}

                <div className="px-5 py-4 border-b border-gray-200">

                  <div className="flex items-center gap-3">

                    {/* USER IMAGE */}

                    <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">

                      {user?.image ? (

                        <img
                          src={user.image}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />

                      ) : (

                        <span className="text-gray-700 font-bold text-lg">
                          {userInitial}
                        </span>

                      )}

                    </div>

                    {/* NAME + EMAIL */}

                    <div className="min-w-0">

                      <p className="font-semibold truncate">
                        {userName}
                      </p>

                      <p className="text-xs text-gray-500 truncate">
                        {userEmail}
                      </p>

                    </div>

                  </div>

                </div>

                {/* ================================= */}
                {/* MANAGE ACCOUNT */}
                {/* ================================= */}

                <button
                  onClick={() => {
                    setShowMenu(false);
                    navigate("/profile");
                  }}
                  className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-100 transition text-left"
                >

                  <Settings
                    size={18}
                    className="text-gray-600"
                  />

                  <span className="text-sm">
                    Manage Account
                  </span>

                </button>

                {/* ================================= */}
                {/* MY BOOKINGS */}
                {/* ================================= */}

                <button
                  onClick={() => {
                    setShowMenu(false);
                    navigate("/my-booking");
                  }}
                  className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-100 transition text-left"
                >

                  <Ticket
                    size={18}
                    className="text-gray-600"
                  />

                  <span className="text-sm">
                    My Bookings
                  </span>

                </button>

                {/* ================================= */}
                {/* NEAREST MOVIE CENTER */}
                {/* ================================= */}

                <button
                  onClick={() => {
                    setShowMenu(false);
                    navigate("/movie-center");
                  }}
                  className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-100 transition text-left"
                >

                  <Ticket
                    size={18}
                    className="text-gray-600"
                  />

                  <span className="text-sm">
                    Nearest Movie Center
                  </span>

                </button>

                {/* ================================= */}
                {/* SIGN OUT */}
                {/* ================================= */}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-100 transition text-left"
                >

                  <LogOut
                    size={18}
                    className="text-gray-600"
                  />

                  <span className="text-sm">
                    Sign out
                  </span>

                </button>

                {/* ================================= */}
                {/* ADD ACCOUNT */}
                {/* ================================= */}

                <button
                  onClick={() => {
                    setShowMenu(false);
                    navigate("/login");
                  }}
                  className="w-full flex items-center gap-4 px-5 py-3 border-t border-gray-200 hover:bg-gray-100 transition text-left"
                >

                  <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center">

                    <Plus
                      size={13}
                      className="text-gray-500"
                    />

                  </div>

                  <span className="text-sm">
                    Add account
                  </span>

                </button>

                {/* ================================= */}
                {/* FOOTER */}
                {/* ================================= */}

                <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 text-center">

                  <p className="text-[11px] text-gray-400">
                    QuickShow Account
                  </p>

                </div>

              </div>

            )}

          </div>

        </div>

      </div>

    </nav>
  );
};

export default Navbar;