import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import {
    MapPin,
    Clock,
    Film,
    Loader2,
    RefreshCw,
    CalendarDays,
    Ticket,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BlurCircle from "../components/BlurCircle";

const API_BASE_URL = "http://localhost:5000";

const Theaters = () => {
    const navigate = useNavigate();

    const [theaters, setTheaters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // =====================================================
    // FETCH THEATERS WITH MOVIES
    // =====================================================

    const fetchTheaters = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await axios.get(
                `${API_BASE_URL}/theater/with-movies`
            );

            console.log("====================================");
            console.log("THEATER WITH MOVIES API RESPONSE");
            console.log(response.data);
            console.log("====================================");

            if (response.data?.success) {
                const theaterData = Array.isArray(
                    response.data.theaters
                )
                    ? response.data.theaters
                    : [];

                console.log("TOTAL THEATERS:", theaterData.length);

                theaterData.forEach((theater) => {
                    console.log(
                        "Theater:",
                        theater.name
                    );

                    console.log(
                        "Movies:",
                        theater.movies
                    );

                    theater.movies?.forEach((movie) => {
                        console.log(
                            "Movie:",
                            movie.title
                        );

                        console.log(
                            "Shows:",
                            movie.shows
                        );
                    });
                });

                setTheaters(theaterData);
            } else {
                setError(
                    response.data?.message ||
                        "Failed to load theaters."
                );
            }
        } catch (err) {
            console.error(
                "Error fetching theaters:",
                err
            );

            console.error(
                "Server response:",
                err.response?.data
            );

            setError(
                err.response?.data?.message ||
                    "Unable to connect to server."
            );
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // INITIAL FETCH
    // =====================================================

    useEffect(() => {
        fetchTheaters();
    }, []);

    // =====================================================
    // FORMAT TIME
    // =====================================================

    const formatTime = (dateTime) => {
        if (!dateTime) {
            return "N/A";
        }

        const date = new Date(dateTime);

        if (isNaN(date.getTime())) {
            return "Invalid Time";
        }

        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    // =====================================================
    // FORMAT DATE
    // =====================================================

    const formatDate = (dateTime) => {
        if (!dateTime) {
            return "";
        }

        const date = new Date(dateTime);

        if (isNaN(date.getTime())) {
            return "";
        }

        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    // =====================================================
    // MOVIE POSTER
    // =====================================================

    const getPoster = (posterPath) => {
        if (!posterPath) {
            return "/fallback.jpg";
        }

        if (
            posterPath.startsWith("http://") ||
            posterPath.startsWith("https://")
        ) {
            return posterPath;
        }

        return `https://image.tmdb.org/t/p/w500${posterPath}`;
    };

    // =====================================================
    // IMAGE ERROR
    // =====================================================

    const handleImageError = (e) => {
        e.currentTarget.src = "/fallback.jpg";
    };

    // =====================================================
    // HANDLE SHOWTIME CLICK
    // =====================================================

    const handleShowClick = (show, movie) => {
        if (!show?._id) {
            console.error("Show ID missing:", show);
            return;
        }

        console.log("Selected Show:", show);
        console.log("Selected Movie:", movie);

        /*
         * Navigate to your SeatLayout page.
         *
         * Change this URL only if your existing
         * SeatLayout route is different.
         */

        navigate(`/seat-layout/${show._id}`, {
            state: {
                show,
                movie,
            },
        });
    };

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <>
            <Navbar />

            <div className="relative min-h-screen bg-[#0f0f0f] text-white overflow-hidden">

                {/* =====================================================
                    BACKGROUND
                ===================================================== */}

                <BlurCircle
                    top="-80px"
                    left="-80px"
                />

                <BlurCircle
                    top="500px"
                    right="-100px"
                />

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">

                    {/* =====================================================
                        PAGE HEADER
                    ===================================================== */}

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">

                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold">
                                Theaters
                            </h1>

                            <p className="text-gray-400 mt-2">
                                Explore movies and showtimes available
                                at different theaters.
                            </p>
                        </div>

                        {!loading && (
                            <button
                                type="button"
                                onClick={fetchTheaters}
                                className="
                                    flex
                                    items-center
                                    justify-center
                                    gap-2
                                    px-4
                                    py-2
                                    rounded-lg
                                    bg-gray-800
                                    border
                                    border-gray-700
                                    hover:bg-gray-700
                                    transition
                                    text-sm
                                "
                            >
                                <RefreshCw size={16} />

                                Refresh
                            </button>
                        )}
                    </div>

                    {/* =====================================================
                        LOADING
                    ===================================================== */}

                    {loading && (
                        <div className="flex flex-col items-center justify-center py-20">

                            <Loader2
                                className="animate-spin text-primary"
                                size={40}
                            />

                            <p className="text-gray-400 mt-4">
                                Loading theaters and movies...
                            </p>

                        </div>
                    )}

                    {/* =====================================================
                        ERROR
                    ===================================================== */}

                    {!loading && error && (
                        <div
                            className="
                                bg-red-500/10
                                border
                                border-red-500/30
                                rounded-xl
                                p-6
                                text-center
                            "
                        >
                            <p className="text-red-400">
                                {error}
                            </p>

                            <p className="text-gray-500 text-sm mt-2">
                                Make sure your backend is running
                                on port 5000.
                            </p>

                            <button
                                type="button"
                                onClick={fetchTheaters}
                                className="
                                    mt-5
                                    px-5
                                    py-2
                                    rounded-lg
                                    bg-primary
                                    hover:opacity-90
                                    transition
                                    font-medium
                                "
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* =====================================================
                        NO THEATERS
                    ===================================================== */}

                    {!loading &&
                        !error &&
                        theaters.length === 0 && (
                            <div className="text-center py-20">

                                <Film
                                    size={50}
                                    className="mx-auto text-gray-600"
                                />

                                <h2 className="text-xl font-semibold mt-4">
                                    No theaters available
                                </h2>

                                <p className="text-gray-500 mt-2">
                                    No movie shows are currently
                                    assigned to theaters.
                                </p>

                            </div>
                        )}

                    {/* =====================================================
                        THEATERS
                    ===================================================== */}

                    {!loading &&
                        !error &&
                        theaters.length > 0 && (
                            <div className="space-y-8">

                                {theaters.map(
                                    (theater, theaterIndex) => {

                                        const movies =
                                            Array.isArray(
                                                theater.movies
                                            )
                                                ? theater.movies
                                                : [];

                                        return (
                                            <div
                                                key={
                                                    theater._id ||
                                                    theaterIndex
                                                }
                                                className="
                                                    bg-gray-900/80
                                                    border
                                                    border-gray-800
                                                    rounded-2xl
                                                    p-5
                                                    sm:p-7
                                                    shadow-xl
                                                "
                                            >

                                                {/* =====================================================
                                                    THEATER INFORMATION
                                                ===================================================== */}

                                                <div
                                                    className="
                                                        flex
                                                        flex-col
                                                        sm:flex-row
                                                        sm:items-start
                                                        sm:justify-between
                                                        gap-4
                                                    "
                                                >

                                                    <div>

                                                        <h2
                                                            className="
                                                                text-2xl
                                                                font-bold
                                                                text-white
                                                            "
                                                        >
                                                            {theater.name ||
                                                                "Unknown Theater"}
                                                        </h2>

                                                        <div
                                                            className="
                                                                flex
                                                                items-center
                                                                gap-2
                                                                text-gray-400
                                                                mt-2
                                                            "
                                                        >
                                                            <MapPin
                                                                size={17}
                                                                className="
                                                                    text-primary
                                                                    shrink-0
                                                                "
                                                            />

                                                            <span>
                                                                {theater.address
                                                                    ? `${theater.address}, `
                                                                    : ""}

                                                                {theater.city ||
                                                                    "Kathmandu"}
                                                            </span>
                                                        </div>

                                                    </div>

                                                    <div
                                                        className="
                                                            flex
                                                            items-center
                                                            gap-2
                                                            text-sm
                                                            text-gray-400
                                                        "
                                                    >
                                                        <Film size={17} />

                                                        <span>
                                                            {movies.length}{" "}
                                                            {movies.length ===
                                                            1
                                                                ? "Movie"
                                                                : "Movies"}
                                                        </span>
                                                    </div>

                                                </div>

                                                {/* =====================================================
                                                    MOVIES
                                                ===================================================== */}

                                                <div className="mt-7">

                                                    <h3
                                                        className="
                                                            text-lg
                                                            font-semibold
                                                            mb-5
                                                            flex
                                                            items-center
                                                            gap-2
                                                        "
                                                    >
                                                        <Film
                                                            size={20}
                                                            className="text-primary"
                                                        />

                                                        Movies Available
                                                    </h3>

                                                    {movies.length > 0 ? (

                                                        <div className="space-y-6">

                                                            {movies.map(
                                                                (
                                                                    movie,
                                                                    movieIndex
                                                                ) => {

                                                                    const shows =
                                                                        Array.isArray(
                                                                            movie.shows
                                                                        )
                                                                            ? [
                                                                                  ...movie.shows,
                                                                              ]
                                                                            : [];

                                                                    /*
                                                                     * Sort showtimes
                                                                     * by date/time.
                                                                     */

                                                                    shows.sort(
                                                                        (
                                                                            a,
                                                                            b
                                                                        ) =>
                                                                            new Date(
                                                                                a.showDateTime
                                                                            ) -
                                                                            new Date(
                                                                                b.showDateTime
                                                                            )
                                                                    );

                                                                    return (
                                                                        <div
                                                                            key={
                                                                                movie._id ||
                                                                                movieIndex
                                                                            }
                                                                            className="
                                                                                bg-gray-800/70
                                                                                border
                                                                                border-gray-700
                                                                                rounded-xl
                                                                                p-4
                                                                                sm:p-5
                                                                            "
                                                                        >

                                                                            {/* =====================================================
                                                                                MOVIE
                                                                            ===================================================== */}

                                                                            <div
                                                                                className="
                                                                                    flex
                                                                                    flex-col
                                                                                    sm:flex-row
                                                                                    gap-5
                                                                                "
                                                                            >

                                                                                {/* POSTER */}

                                                                                <img
                                                                                    src={getPoster(
                                                                                        movie.poster_path
                                                                                    )}
                                                                                    alt={
                                                                                        movie.title ||
                                                                                        "Movie"
                                                                                    }
                                                                                    onError={
                                                                                        handleImageError
                                                                                    }
                                                                                    className="
                                                                                        w-24
                                                                                        h-36
                                                                                        sm:w-28
                                                                                        sm:h-40
                                                                                        object-cover
                                                                                        rounded-lg
                                                                                        shrink-0
                                                                                        bg-gray-700
                                                                                    "
                                                                                />

                                                                                {/* MOVIE DETAILS */}

                                                                                <div
                                                                                    className="
                                                                                        min-w-0
                                                                                        flex-1
                                                                                    "
                                                                                >

                                                                                    <h4
                                                                                        className="
                                                                                            text-lg
                                                                                            sm:text-xl
                                                                                            font-semibold
                                                                                        "
                                                                                    >
                                                                                        {movie.title ||
                                                                                            "Movie title not available"}
                                                                                    </h4>

                                                                                    {/* MOVIE INFO */}

                                                                                    <div
                                                                                        className="
                                                                                            flex
                                                                                            flex-wrap
                                                                                            items-center
                                                                                            gap-x-3
                                                                                            gap-y-1
                                                                                            text-sm
                                                                                            text-gray-400
                                                                                            mt-2
                                                                                        "
                                                                                    >

                                                                                        <span>
                                                                                            {movie.release_date
                                                                                                ? new Date(
                                                                                                      movie.release_date
                                                                                                  ).getFullYear()
                                                                                                : "N/A"}
                                                                                        </span>

                                                                                        <span>
                                                                                            •
                                                                                        </span>

                                                                                        <span>
                                                                                            {movie.runtime
                                                                                                ? `${movie.runtime} min`
                                                                                                : "N/A"}
                                                                                        </span>

                                                                                        {movie.vote_average >
                                                                                            0 && (
                                                                                            <>
                                                                                                <span>
                                                                                                    •
                                                                                                </span>

                                                                                                <span>
                                                                                                    ⭐{" "}
                                                                                                    {Number(
                                                                                                        movie.vote_average
                                                                                                    ).toFixed(
                                                                                                        1
                                                                                                    )}
                                                                                                </span>
                                                                                            </>
                                                                                        )}

                                                                                    </div>

                                                                                    {/* GENRES */}

                                                                                    {Array.isArray(
                                                                                        movie.genres
                                                                                    ) &&
                                                                                        movie.genres.length >
                                                                                            0 && (
                                                                                            <div
                                                                                                className="
                                                                                                    flex
                                                                                                    flex-wrap
                                                                                                    gap-2
                                                                                                    mt-3
                                                                                                "
                                                                                            >
                                                                                                {movie.genres
                                                                                                    .slice(
                                                                                                        0,
                                                                                                        3
                                                                                                    )
                                                                                                    .map(
                                                                                                        (
                                                                                                            genre,
                                                                                                            index
                                                                                                        ) => (
                                                                                                            <span
                                                                                                                key={
                                                                                                                    genre.id ||
                                                                                                                    index
                                                                                                                }
                                                                                                                className="
                                                                                                                    px-2
                                                                                                                    py-1
                                                                                                                    text-xs
                                                                                                                    rounded-full
                                                                                                                    bg-gray-700
                                                                                                                    text-gray-300
                                                                                                                "
                                                                                                            >
                                                                                                                {genre.name ||
                                                                                                                    genre}
                                                                                                            </span>
                                                                                                        )
                                                                                                    )}
                                                                                            </div>
                                                                                        )}

                                                                                </div>

                                                                            </div>

                                                                            {/* =====================================================
                                                                                SHOWTIMES
                                                                            ===================================================== */}

                                                                            <div className="mt-6">

                                                                                <div
                                                                                    className="
                                                                                        flex
                                                                                        items-center
                                                                                        gap-2
                                                                                        text-sm
                                                                                        text-gray-300
                                                                                        mb-3
                                                                                    "
                                                                                >
                                                                                    <Clock
                                                                                        size={
                                                                                            16
                                                                                        }
                                                                                        className="text-primary"
                                                                                    />

                                                                                    <span className="font-medium">
                                                                                        Showtimes
                                                                                    </span>
                                                                                </div>

                                                                                {shows.length >
                                                                                0 ? (

                                                                                    <div
                                                                                        className="
                                                                                            grid
                                                                                            grid-cols-2
                                                                                            sm:grid-cols-3
                                                                                            md:grid-cols-4
                                                                                            lg:grid-cols-5
                                                                                            gap-3
                                                                                        "
                                                                                    >
                                                                                        {shows.map(
                                                                                            (
                                                                                                show,
                                                                                                showIndex
                                                                                            ) => (
                                                                                                <button
                                                                                                    key={
                                                                                                        show._id ||
                                                                                                        showIndex
                                                                                                    }
                                                                                                    type="button"
                                                                                                    onClick={() =>
                                                                                                        handleShowClick(
                                                                                                            show,
                                                                                                            movie
                                                                                                        )
                                                                                                    }
                                                                                                    className="
                                                                                                        group
                                                                                                        text-left
                                                                                                        px-4
                                                                                                        py-3
                                                                                                        rounded-xl
                                                                                                        bg-gray-700
                                                                                                        hover:bg-primary
                                                                                                        border
                                                                                                        border-gray-600
                                                                                                        hover:border-primary
                                                                                                        transition-all
                                                                                                        duration-200
                                                                                                        hover:scale-[1.02]
                                                                                                    "
                                                                                                >

                                                                                                    <div
                                                                                                        className="
                                                                                                            flex
                                                                                                            items-center
                                                                                                            gap-2
                                                                                                            text-white
                                                                                                            font-semibold
                                                                                                        "
                                                                                                    >
                                                                                                        <Clock
                                                                                                            size={
                                                                                                                15
                                                                                                            }
                                                                                                        />

                                                                                                        {formatTime(
                                                                                                            show.showDateTime
                                                                                                        )}
                                                                                                    </div>

                                                                                                    <div
                                                                                                        className="
                                                                                                            flex
                                                                                                            items-center
                                                                                                            gap-2
                                                                                                            text-xs
                                                                                                            text-gray-400
                                                                                                            group-hover:text-white/80
                                                                                                            mt-1
                                                                                                        "
                                                                                                    >
                                                                                                        <CalendarDays
                                                                                                            size={
                                                                                                                13
                                                                                                            }
                                                                                                        />

                                                                                                        {formatDate(
                                                                                                            show.showDateTime
                                                                                                        )}
                                                                                                    </div>

                                                                                                    <div
                                                                                                        className="
                                                                                                            flex
                                                                                                            items-center
                                                                                                            gap-2
                                                                                                            text-xs
                                                                                                            text-primary
                                                                                                            group-hover:text-white
                                                                                                            mt-2
                                                                                                        "
                                                                                                    >
                                                                                                        <Ticket
                                                                                                            size={
                                                                                                                13
                                                                                                            }
                                                                                                        />

                                                                                                        NPR{" "}
                                                                                                        {show.showPrice ??
                                                                                                            0}
                                                                                                    </div>

                                                                                                </button>
                                                                                            )
                                                                                        )}
                                                                                    </div>

                                                                                ) : (

                                                                                    <div
                                                                                        className="
                                                                                            bg-gray-900/50
                                                                                            border
                                                                                            border-gray-700
                                                                                            rounded-lg
                                                                                            p-4
                                                                                        "
                                                                                    >
                                                                                        <p className="text-sm text-gray-500">
                                                                                            No showtimes
                                                                                            available.
                                                                                        </p>
                                                                                    </div>

                                                                                )}

                                                                            </div>

                                                                        </div>
                                                                    );
                                                                }
                                                            )}

                                                        </div>

                                                    ) : (

                                                        <div
                                                            className="
                                                                bg-gray-800/50
                                                                border
                                                                border-gray-700
                                                                rounded-xl
                                                                p-5
                                                            "
                                                        >
                                                            <p className="text-gray-500">
                                                                No movies
                                                                available
                                                                at this
                                                                theater.
                                                            </p>
                                                        </div>

                                                    )}

                                                </div>

                                            </div>
                                        );
                                    }
                                )}

                            </div>
                        )}

                </div>
            </div>

            <Footer />
        </>
    );
};

export default Theaters;