import React, {
    useState,
    useEffect,
    useRef,
} from "react";

import {
    Link,
    useNavigate,
    useLocation,
} from "react-router-dom";

import {
    Search,
    Settings,
    Ticket,
    LogOut,
    Plus,
    X,
    Menu,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { axios } = useAppContext();

    // ---- States ----
    const [showMenu, setShowMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [hasFavorites, setHasFavorites] = useState(false);
    const [allMovies, setAllMovies] = useState([]);
    const [moviesLoaded, setMoviesLoaded] = useState(false);

    // Refs
    const menuRef = useRef(null);
    const searchRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    // =====================================================
    // FETCH SHOWS AND EXTRACT UNIQUE MOVIES
    // =====================================================
    useEffect(() => {
        const fetchShowsAndMovies = async () => {
            try {
                const response = await fetch("http://localhost:5000/show/all");
                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }
                const data = await response.json();

                console.log("Shows response:", data);

                if (!data.success || !Array.isArray(data.shows)) {
                    setAllMovies([]);
                    setMoviesLoaded(true);
                    return;
                }

                const movieMap = new Map();
                data.shows.forEach((show) => {
                    if (show.movie) {
                        const movie = show.movie;
                        const id = movie._id || movie.id;
                        if (id && !movieMap.has(String(id))) {
                            movieMap.set(String(id), movie);
                        }
                    }
                });

                const uniqueMovies = Array.from(movieMap.values());
                console.log("Unique movies for search:", uniqueMovies);
                setAllMovies(uniqueMovies);
            } catch (error) {
                console.error("Error fetching shows:", error);
                setAllMovies([]);
            } finally {
                setMoviesLoaded(true);
            }
        };

        fetchShowsAndMovies();
    }, []);

    // =====================================================
    // SEARCH
    // =====================================================
    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        const performSearch = () => {
            const query = searchText.trim().toLowerCase();
            if (!query) {
                setSearchResults([]);
                setSearchLoading(false);
                return;
            }

            if (!moviesLoaded) {
                setSearchLoading(true);
                return;
            }

            setSearchLoading(true);
            searchTimeoutRef.current = setTimeout(() => {
                const filtered = allMovies.filter((movie) => {
                    const title = (movie.title || movie.name || movie.original_title || "")
                        .toLowerCase()
                        .trim();
                    return title.includes(query);
                });

                setSearchResults(filtered);
                setSearchLoading(false);
            }, 150);
        };

        performSearch();

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, [searchText, allMovies, moviesLoaded]);

    // =====================================================
    // FETCH FAVORITES
    // =====================================================
    const fetchFavorites = async () => {
        try {
            const token =
                localStorage.getItem("userToken") ||
                localStorage.getItem("token");

            if (!token) {
                setHasFavorites(false);
                return;
            }

            const response = await fetch("http://localhost:5000/user/me", {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                setHasFavorites(false);
                return;
            }

            const data = await response.json();
            const favorites = data.user?.favourites || data.favourites || [];

            console.log("Navbar favorites check:", favorites.length);

            setHasFavorites(favorites.length > 0);
        } catch (error) {
            console.error("Error fetching favorites:", error);
            setHasFavorites(false);
        }
    };

    // =====================================================
    // LOAD FAVORITES
    // 1. On mount / user change
    // 2. When "favoritesUpdated" event fires (custom)
    // 3. When window regains focus
    // 4. When route changes
    // =====================================================
    useEffect(() => {
        fetchFavorites();

        // Custom event — dispatched from MovieDetail / Favorite page
        const handleFavoritesUpdated = () => {
            console.log("🔄 favoritesUpdated event received");
            fetchFavorites();
        };

        // Storage event — fires if token changes across tabs
        const handleStorage = () => fetchFavorites();

        // Window focus — re-check when user returns to tab
        const handleFocus = () => fetchFavorites();

        window.addEventListener("favoritesUpdated", handleFavoritesUpdated);
        window.addEventListener("storage", handleStorage);
        window.addEventListener("focus", handleFocus);

        return () => {
            window.removeEventListener("favoritesUpdated", handleFavoritesUpdated);
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener("focus", handleFocus);
        };
    }, [user]);

    // Re-check on every route change (main fix)
    useEffect(() => {
        if (user) {
            fetchFavorites();
        }
    }, [location.pathname]);

    // =====================================================
    // MOVIE CLICK
    // =====================================================
    const handleMovieClick = (movie) => {
        const movieId = movie._id || movie.id;
        if (!movieId) return;

        setSearchText("");
        setSearchResults([]);
        setSearchOpen(false);
        navigate(`/movies/${movieId}`);
        window.scrollTo(0, 0);
    };

    // =====================================================
    // CLOSE SEARCH
    // =====================================================
    const closeSearch = () => {
        setSearchOpen(false);
        setSearchText("");
        setSearchResults([]);
    };

    // =====================================================
    // LOGOUT
    // =====================================================
    const handleLogout = () => {
        setShowMenu(false);
        setShowMobileMenu(false);
        if (logout) logout();
        else {
            localStorage.removeItem("userUser");
            localStorage.removeItem("userToken");
            localStorage.removeItem("user");
            localStorage.removeItem("token");
        }
        setHasFavorites(false);
        navigate("/login");
    };

    // =====================================================
    // CLOSE DROPDOWNS ON OUTSIDE CLICK
    // =====================================================
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const userName = user?.name || user?.username || "";
    const userEmail = user?.email || "";
    const userInitial = userName ? userName.charAt(0).toUpperCase() : "?";

    // =====================================================
    // MOBILE LINKS — Favorites conditional
    // =====================================================
    const mobileLinks = [
        { name: "Home", path: "/" },
        { name: "Movies", path: "/movies" },
        { name: "Theaters", path: "/theaters" },
        { name: "Releases", path: "/releases" },
        ...(hasFavorites ? [{ name: "Favorites", path: "/favorite" }] : []),
    ];

    const handleMobileNav = (path) => {
        setShowMobileMenu(false);
        navigate(path);
        window.scrollTo(0, 0);
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

                {/* LOGO */}
                <Link to="/" className="text-2xl font-bold text-white">
                    Quick<span className="text-primary">Show</span>
                </Link>

                {/* NAV LINKS (DESKTOP) */}
                <div className="hidden md:flex items-center gap-8 text-sm text-gray-200">
                    <Link to="/" className="hover:text-primary transition">Home</Link>
                    <Link to="/movies" className="hover:text-primary transition">Movies</Link>
                    <Link to="/theaters" className="hover:text-primary transition">Theaters</Link>
                    <Link to="/releases" className="hover:text-primary transition">Releases</Link>

                    {/* Favorites — only if user has favorites */}
                    {hasFavorites && (
                        <Link to="/favorite" className="hover:text-primary transition">
                            Favorites
                        </Link>
                    )}
                </div>

                {/* RIGHT SIDE */}
                <div className="flex items-center gap-5">

                    {/* SEARCH */}
                    <div className="relative" ref={searchRef}>
                        {!searchOpen ? (
                            <Search
                                size={22}
                                className="text-white cursor-pointer hover:text-primary transition"
                                onClick={() => setSearchOpen(true)}
                            />
                        ) : (
                            <div className="relative">
                                <div className="flex items-center gap-2 border border-gray-600 rounded-full px-3 py-1.5 bg-black/90">
                                    <Search size={18} className="text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search movies..."
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        className="bg-transparent outline-none text-sm text-white w-52"
                                        autoFocus
                                    />
                                    <X size={18} className="cursor-pointer text-gray-300 hover:text-white" onClick={closeSearch} />
                                </div>

                                {searchText.trim() !== "" && (
                                    <div className="absolute right-0 top-12 w-96 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                                        {searchLoading ? (
                                            <div className="px-4 py-6 text-center">
                                                <p className="text-gray-400 text-sm">Searching...</p>
                                            </div>
                                        ) : searchResults.length > 0 ? (
                                            <div className="max-h-96 overflow-y-auto">
                                                {searchResults.map((movie) => (
                                                    <button
                                                        key={movie._id || movie.id}
                                                        onClick={() => handleMovieClick(movie)}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition text-left"
                                                    >
                                                        <img
                                                            src={movie.poster_path || movie.poster || movie.image}
                                                            alt={movie.title || "Movie"}
                                                            className="w-12 h-16 object-cover rounded-md flex-shrink-0"
                                                            onError={(e) => e.currentTarget.style.display = "none"}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white text-sm font-semibold truncate">
                                                                {movie.title || movie.name || "Untitled Movie"}
                                                            </p>
                                                            {movie.release_date && (
                                                                <p className="text-gray-400 text-xs mt-1">{movie.release_date}</p>
                                                            )}
                                                            <span className="inline-block mt-2 px-2 py-1 text-[10px] rounded-full bg-green-600/20 text-green-400 border border-green-600/30">
                                                                Now Showing
                                                            </span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="px-4 py-6 text-center">
                                                <p className="text-gray-400 text-sm">No movies match "{searchText}"</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* PROFILE */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowMenu((prev) => !prev)}
                            className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden border border-gray-300 hover:scale-105 transition cursor-pointer"
                        >
                            {user?.image ? (
                                <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-black font-semibold">{userInitial}</span>
                            )}
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-2xl overflow-hidden text-gray-800">
                                <div className="px-5 py-4 border-b border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {user?.image ? (
                                                <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-gray-700 font-bold text-lg">{userInitial}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold truncate">{userName || "Guest User"}</p>
                                            {userEmail && <p className="text-xs text-gray-500 truncate">{userEmail}</p>}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => { setShowMenu(false); navigate("/profile"); }}
                                    className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-100 transition text-left cursor-pointer"
                                >
                                    <Settings size={18} className="text-gray-600" />
                                    <span className="text-sm">Manage Account</span>
                                </button>
                                <button
                                    onClick={() => { setShowMenu(false); navigate("/my-booking"); }}
                                    className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-100 transition text-left cursor-pointer"
                                >
                                    <Ticket size={18} className="text-gray-600" />
                                    <span className="text-sm">My Bookings</span>
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-100 transition text-left cursor-pointer"
                                >
                                    <LogOut size={18} className="text-gray-600" />
                                    <span className="text-sm">Sign out</span>
                                </button>
                                <button
                                    onClick={() => { setShowMenu(false); navigate("/login"); }}
                                    className="w-full flex items-center gap-4 px-5 py-3 border-t border-gray-200 hover:bg-gray-100 transition text-left cursor-pointer"
                                >
                                    <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center">
                                        <Plus size={13} className="text-gray-500" />
                                    </div>
                                    <span className="text-sm">Add account</span>
                                </button>
                                <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 text-center">
                                    <p className="text-[11px] text-gray-400">QuickShow Account</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MOBILE MENU TOGGLE */}
                    <button
                        onClick={() => setShowMobileMenu((prev) => !prev)}
                        className="md:hidden text-white hover:text-primary transition cursor-pointer"
                        aria-label="Toggle menu"
                    >
                        {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
                    </button>

                </div>
            </div>

            {/* MOBILE MENU DROPDOWN */}
            {showMobileMenu && (
                <div className="md:hidden border-t border-white/10 bg-black/95 backdrop-blur-md">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
                        {mobileLinks.map((link) => (
                            <button
                                key={link.path}
                                onClick={() => handleMobileNav(link.path)}
                                className="w-full text-left py-3 px-2 text-sm text-gray-200 hover:text-primary hover:bg-white/5 rounded-lg transition"
                            >
                                {link.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;