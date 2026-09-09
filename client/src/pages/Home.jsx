import React, { useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import HeroSection from "../components/HeroSection";
import FeaturedSection from "../components/FeaturedSection";
import TrailerSection from "../components/TrailerSection";

import { useAutoRefresh } from "../context/RefreshContext";

// =====================================================
// DISTANCE CALCULATION
// =====================================================

const getDistanceFromLatLonInKm = (
    lat1,
    lon1,
    lat2,
    lon2
) => {
    const R = 6371;

    const dLat =
        (Number(lat2) - Number(lat1)) *
        (Math.PI / 180);

    const dLon =
        (Number(lon2) - Number(lon1)) *
        (Math.PI / 180);

    const a =
        Math.sin(dLat / 2) *
            Math.sin(dLat / 2) +
        Math.cos(
            Number(lat1) * (Math.PI / 180)
        ) *
            Math.cos(
                Number(lat2) *
                    (Math.PI / 180)
            ) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
};

// =====================================================
// HOME
// =====================================================

const Home = () => {
    const navigate = useNavigate();

    // =================================================
    // STATES
    // =================================================

    const [theaters, setTheaters] = useState([]);

    const [loading, setLoading] =
        useState(false);

    const [hasSearched, setHasSearched] =
        useState(false);

    const [locationError, setLocationError] =
        useState(false);

    const [
        showSettingsModal,
        setShowSettingsModal,
    ] = useState(false);

    const [selectedTheater, setSelectedTheater] =
        useState(null);

    const [availableMovies, setAvailableMovies] =
        useState([]);

    const [loadingMovies, setLoadingMovies] =
        useState(false);

    // =================================================
    // FETCH MOVIES AVAILABLE AT SELECTED THEATER
    // =================================================

    const fetchMoviesForTheater = useCallback(
        async (theater) => {
            if (!theater?._id) {
                return;
            }

            try {
                setLoadingMovies(true);
                setAvailableMovies([]);

                console.log(
                    "Selected theater:",
                    theater
                );

                // -------------------------------------------------
                // Get all shows
                // -------------------------------------------------

                const response =
                    await axios.get(
                        "http://localhost:5000/show/all"
                    );

                console.log(
                    "All shows:",
                    response.data
                );

                const shows =
                    Array.isArray(
                        response.data?.shows
                    )
                        ? response.data.shows
                        : [];

                // -------------------------------------------------
                // Filter shows belonging to this theater
                // -------------------------------------------------

                const theaterId =
                    String(theater._id);

                const theaterShows =
                    shows.filter((show) => {
                        const showTheaterId =
                            show.theaterId ||
                            show.theater?._id ||
                            show.theater;

                        return (
                            showTheaterId &&
                            String(
                                showTheaterId
                            ) === theaterId
                        );
                    });

                console.log(
                    "Shows for selected theater:",
                    theaterShows
                );

                // -------------------------------------------------
                // Extract unique movies
                // -------------------------------------------------

                const movieMap = new Map();

                theaterShows.forEach(
                    (show) => {
                        let movie =
                            show.movie;

                        // If movie is populated
                        if (
                            movie &&
                            typeof movie ===
                                "object" &&
                            movie._id
                        ) {
                            if (
                                !movieMap.has(
                                    String(
                                        movie._id
                                    )
                                )
                            ) {
                                movieMap.set(
                                    String(
                                        movie._id
                                    ),
                                    {
                                        ...movie,
                                        showId:
                                            show._id,
                                        showDateTimes:
                                            show.dateTimes ||
                                            [],
                                        price:
                                            show.price ||
                                            show.showPrice ||
                                            0,
                                    }
                                );
                            }

                            return;
                        }

                        // -------------------------------------------------
                        // If movie is only an ID
                        // -------------------------------------------------

                        if (
                            movie &&
                            typeof movie ===
                                "string"
                        ) {
                            const movieId =
                                String(movie);

                            if (
                                !movieMap.has(
                                    movieId
                                )
                            ) {
                                movieMap.set(
                                    movieId,
                                    {
                                        _id:
                                            movieId,
                                        title:
                                            show.movieTitle ||
                                            "Movie",
                                        showId:
                                            show._id,
                                        showDateTimes:
                                            show.dateTimes ||
                                            [],
                                        price:
                                            show.price ||
                                            show.showPrice ||
                                            0,
                                    }
                                );
                            }
                        }
                    }
                );

                const movies =
                    Array.from(
                        movieMap.values()
                    );

                console.log(
                    "Movies available at theater:",
                    movies
                );

                setAvailableMovies(
                    movies
                );
            } catch (error) {
                console.error(
                    "Error fetching movies for theater:",
                    error
                );

                setAvailableMovies([]);
            } finally {
                setLoadingMovies(false);
            }
        },
        []
    );

    // =================================================
    // CLICK THEATER
    // =================================================

    const handleTheaterClick = async (
        theater
    ) => {
        setSelectedTheater(theater);

        await fetchMoviesForTheater(
            theater
        );
    };

    // =================================================
    // CLOSE THEATER MOVIE MODAL
    // =================================================

    const closeTheaterMovies = () => {
        setSelectedTheater(null);
        setAvailableMovies([]);
    };

    // =================================================
    // LOCATION REQUEST
    // =================================================

    const requestLocation = () => {
        if (!navigator.geolocation) {
            setLocationError(true);
            setShowSettingsModal(true);
            return;
        }

        setLoading(true);
        setLocationError(false);
        setShowSettingsModal(false);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat =
                    position.coords.latitude;

                const lng =
                    position.coords.longitude;

                console.log(
                    "User latitude:",
                    lat
                );

                console.log(
                    "User longitude:",
                    lng
                );

                try {
                    // -------------------------------------------------
                    // Get nearby theaters
                    // -------------------------------------------------

                    const response =
                        await axios.get(
                            "http://localhost:5000/theater/nearby",
                            {
                                params: {
                                    longitude:
                                        lng,
                                    latitude:
                                        lat,
                                },
                            }
                        );

                    console.log(
                        "Nearby theater response:",
                        response.data
                    );

                    const backendTheaters =
                        Array.isArray(
                            response.data
                                ?.theaters
                        )
                            ? response.data
                                  .theaters
                            : [];

                    // -------------------------------------------------
                    // Calculate distance separately for every theater
                    // -------------------------------------------------

                    const theatersWithDistance =
                        backendTheaters.map(
                            (theater) => {
                                let theaterLat =
                                    Number(
                                        theater.latitude
                                    );

                                let theaterLng =
                                    Number(
                                        theater.longitude
                                    );

                                // -------------------------------------------------
                                // Fallback to GeoJSON coordinates
                                // -------------------------------------------------

                                if (
                                    (!theaterLat ||
                                        !theaterLng) &&
                                    theater.location
                                        ?.coordinates
                                ) {
                                    theaterLng =
                                        Number(
                                            theater
                                                .location
                                                .coordinates[0]
                                        );

                                    theaterLat =
                                        Number(
                                            theater
                                                .location
                                                .coordinates[1]
                                        );
                                }

                                const distance =
                                    getDistanceFromLatLonInKm(
                                        lat,
                                        lng,
                                        theaterLat,
                                        theaterLng
                                    );

                                console.log(
                                    `Distance to ${theater.name}:`,
                                    distance
                                );

                                return {
                                    ...theater,

                                    latitude:
                                        theaterLat,

                                    longitude:
                                        theaterLng,

                                    distance,
                                };
                            }
                        );

                    // -------------------------------------------------
                    // Sort nearest first
                    // -------------------------------------------------

                    theatersWithDistance.sort(
                        (a, b) =>
                            a.distance -
                            b.distance
                    );

                    setTheaters(
                        theatersWithDistance
                    );

                    setHasSearched(true);
                } catch (err) {
                    console.error(
                        "Error fetching nearby theaters:",
                        err
                    );

                    setTheaters([]);
                    setHasSearched(true);

                    alert(
                        "Could not fetch theaters. Please try again."
                    );
                } finally {
                    setLoading(false);
                }
            },
            (error) => {
                console.warn(
                    "Geolocation error:",
                    error.message
                );

                setLocationError(true);
                setLoading(false);

                setShowSettingsModal(
                    true
                );
            },
            {
                enableHighAccuracy: true,

                timeout: 10000,

                maximumAge: 0,
            }
        );
    };

    // =================================================
    // OPEN WINDOWS LOCATION SETTINGS
    // =================================================

    const openSystemSettings = () => {
        window.open(
            "ms-settings:privacy-location",
            "_blank"
        );

        window.open(
            "ms-settings:privacy-location",
            "_self"
        );
    };

    // =================================================
    // OPEN MOVIE / SHOW
    // =================================================

    const handleMovieClick = (
        movie
    ) => {
        if (!movie?._id) {
            return;
        }

        navigate(
            `/movies/${movie._id}`
        );
    };

    // =================================================
    // UI
    // =================================================

    return (
        <div className="min-h-screen bg-black text-white">

            {/* =================================================
                HERO
            ================================================= */}

            <HeroSection />

            {/* =================================================
                FIND NEARBY CINEMAS
            ================================================= */}

            <div className="max-w-7xl mx-auto px-4 py-8">

                <div className="bg-linear-to-r from-gray-900 to-gray-800 border border-gray-800 rounded-2xl p-6 shadow-xl">

                    {/* =================================================
                        HEADER
                    ================================================= */}

                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                        <div>

                            <h2 className="text-2xl font-bold tracking-tight">
                                Find Movie Centers Near You
                            </h2>

                            <p className="text-gray-400 text-sm mt-1">

                                {hasSearched &&
                                theaters.length ===
                                    0
                                    ? "No theaters found nearby."
                                    : "Allow location to see nearby cinemas."}

                            </p>

                        </div>

                        <button
                            onClick={
                                requestLocation
                            }
                            disabled={
                                loading
                            }
                            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition shadow-lg flex items-center gap-2 whitespace-nowrap"
                        >
                            {loading
                                ? "Locating..."
                                : "📍 Find Cinemas Near Me"}
                        </button>

                    </div>

                    {/* =================================================
                        LOCATION ERROR
                    ================================================= */}

                    {locationError &&
                        !showSettingsModal && (
                            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">

                                <p className="text-yellow-400 text-sm">
                                    ⚠️ Location access
                                    is required.
                                    Please allow
                                    location in your
                                    browser settings.
                                </p>

                                <button
                                    onClick={
                                        requestLocation
                                    }
                                    className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                                    disabled={
                                        loading
                                    }
                                >
                                    {loading
                                        ? "Retrying..."
                                        : "🔄 Retry Location"}
                                </button>

                            </div>
                        )}

                    {/* =================================================
                        THEATER LIST
                    ================================================= */}

                    {hasSearched && (
                        <div className="mt-6">

                            {theaters.length >
                            0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                    {theaters.map(
                                        (
                                            theater
                                        ) => (
                                            <button
                                                type="button"
                                                key={
                                                    theater._id
                                                }
                                                onClick={() =>
                                                    handleTheaterClick(
                                                        theater
                                                    )
                                                }
                                                className="text-left bg-gray-800/80 border border-gray-700/50 hover:border-red-500 hover:bg-gray-700/80 p-5 rounded-xl shadow transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                                            >

                                                <div className="flex items-start justify-between gap-3">

                                                    <div>

                                                        <h3 className="font-bold text-lg text-white">
                                                            {
                                                                theater.name
                                                            }
                                                        </h3>

                                                        <p className="text-sm text-gray-300 mt-1">
                                                            {
                                                                theater.address
                                                            }
                                                            ,{" "}
                                                            {
                                                                theater.city
                                                            }
                                                        </p>

                                                    </div>

                                                    <span className="text-red-400 text-xl">
                                                        →
                                                    </span>

                                                </div>

                                                {/* =================================================
                                                    DISTANCE
                                                ================================================= */}

                                                <div className="mt-3">

                                                    <p className="text-sm text-green-400 font-medium">

                                                        📍{" "}

                                                        {Number(
                                                            theater.distance
                                                        ).toFixed(
                                                            2
                                                        )}{" "}
                                                        km away

                                                    </p>

                                                </div>

                                                <p className="text-xs text-gray-500 mt-3">
                                                    Click to see
                                                    available
                                                    movies
                                                </p>

                                            </button>
                                        )
                                    )}

                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm">
                                    No theaters found
                                    within 10 km.
                                </p>
                            )}

                        </div>
                    )}

                </div>

            </div>

            {/* =====================================================
                SELECTED THEATER / AVAILABLE MOVIES MODAL
            ===================================================== */}

            {selectedTheater && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4"
                    onClick={
                        closeTheaterMovies
                    }
                >

                    <div
                        className="bg-gray-900 border border-gray-700 rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        {/* =================================================
                            MODAL HEADER
                        ================================================= */}

                        <div className="flex items-start justify-between gap-4 mb-6">

                            <div>

                                <h2 className="text-2xl font-bold">
                                    {
                                        selectedTheater.name
                                    }
                                </h2>

                                <p className="text-gray-400 text-sm mt-1">
                                    {
                                        selectedTheater.address
                                    }
                                    ,{" "}
                                    {
                                        selectedTheater.city
                                    }
                                </p>

                                <p className="text-green-400 text-sm mt-2">
                                    📍{" "}
                                    {Number(
                                        selectedTheater.distance
                                    ).toFixed(
                                        2
                                    )}{" "}
                                    km away
                                </p>

                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeTheaterMovies
                                }
                                className="text-gray-400 hover:text-white text-2xl"
                            >
                                ×
                            </button>

                        </div>

                        {/* =================================================
                            MOVIES
                        ================================================= */}

                        <h3 className="text-xl font-semibold mb-4">
                            Movies Available Here
                        </h3>

                        {loadingMovies ? (
                            <div className="py-10 text-center text-gray-400">
                                Loading available
                                movies...
                            </div>
                        ) : availableMovies.length >
                          0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                                {availableMovies.map(
                                    (
                                        movie
                                    ) => (
                                        <div
                                            key={
                                                movie._id
                                            }
                                            className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-red-500 transition"
                                        >

                                            {/* =================================================
                                                MOVIE POSTER
                                            ================================================= */}

                                            {movie.poster_path ||
                                            movie.poster ? (
                                                <img
                                                    src={
                                                        movie.poster_path ||
                                                        movie.poster
                                                    }
                                                    alt={
                                                        movie.title
                                                    }
                                                    className="w-full h-64 object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-64 bg-gray-700 flex items-center justify-center text-gray-400">
                                                    No Poster
                                                </div>
                                            )}

                                            <div className="p-4">

                                                <h4 className="font-bold text-lg">
                                                    {
                                                        movie.title
                                                    }
                                                </h4>

                                                {movie.release_date && (
                                                    <p className="text-gray-400 text-sm mt-1">
                                                        {
                                                            movie.release_date
                                                        }
                                                    </p>
                                                )}

                                                <p className="text-green-400 text-sm mt-2">
                                                    Ticket: Rs.{" "}
                                                    {
                                                        movie.price
                                                    }
                                                </p>

                                                {/* =================================================
                                                    SHOW TIMES
                                                ================================================= */}

                                                {movie.showDateTimes
                                                    ?.length >
                                                    0 && (
                                                    <div className="mt-3">

                                                        <p className="text-xs text-gray-400 mb-2">
                                                            Available
                                                            Shows
                                                        </p>

                                                        <div className="flex flex-wrap gap-2">

                                                            {movie.showDateTimes.map(
                                                                (
                                                                    dt,
                                                                    index
                                                                ) => (
                                                                    <span
                                                                        key={
                                                                            index
                                                                        }
                                                                        className="text-xs bg-gray-700 px-2 py-1 rounded"
                                                                    >
                                                                        {
                                                                            dt.date
                                                                        }{" "}
                                                                        {
                                                                            dt.time
                                                                        }
                                                                    </span>
                                                                )
                                                            )}

                                                        </div>

                                                    </div>
                                                )}

                                                {/* =================================================
                                                    VIEW MOVIE
                                                ================================================= */}

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleMovieClick(
                                                            movie
                                                        )
                                                    }
                                                    className="mt-4 w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition"
                                                >
                                                    View Movie
                                                </button>

                                            </div>

                                        </div>
                                    )
                                )}

                            </div>
                        ) : (
                            <div className="py-10 text-center">

                                <p className="text-gray-400">
                                    No movies are
                                    currently available
                                    at this theater.
                                </p>

                                <p className="text-gray-500 text-sm mt-2">
                                    Please check again
                                    later.
                                </p>

                            </div>
                        )}

                    </div>

                </div>
            )}

            {/* =====================================================
                LOCATION SETTINGS MODAL
            ===================================================== */}

            {showSettingsModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">

                    <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">

                        <h3 className="text-xl font-bold text-white mb-2">
                            🌍 Location Access
                            Required
                        </h3>

                        <p className="text-gray-300 text-sm mb-4">
                            To find nearby theaters,
                            please enable location
                            access in your system
                            settings.
                        </p>

                        <div className="flex flex-col gap-3">

                            <button
                                onClick={
                                    openSystemSettings
                                }
                                className="bg-primary hover:bg-primary/80 text-white py-2.5 rounded-lg font-medium transition"
                            >
                                ⚙️ Open Settings
                            </button>

                            <button
                                onClick={() => {
                                    setShowSettingsModal(
                                        false
                                    );

                                    requestLocation();
                                }}
                                className="bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-medium transition"
                            >
                                🔄 Retry
                            </button>

                            <button
                                onClick={() =>
                                    setShowSettingsModal(
                                        false
                                    )
                                }
                                className="text-gray-400 hover:text-white text-sm transition"
                            >
                                Cancel
                            </button>

                        </div>

                        <p className="text-xs text-gray-500 mt-4 text-center">
                            After enabling location,
                            click <strong>Retry</strong>{" "}
                            to search again.
                        </p>

                    </div>

                </div>
            )}

            {/* =====================================================
                OTHER HOME SECTIONS
            ===================================================== */}

            <FeaturedSection />

            <TrailerSection />

        </div>
    );
};

export default Home;