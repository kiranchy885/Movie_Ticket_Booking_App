import React, {
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
    useParams,
} from "react-router-dom";

import axios from "axios";

import {
    Heart,
    Play,
    Clock,
    Star,
    CalendarDays,
    Ticket,
    ArrowLeft,
} from "lucide-react";

import { toast } from "react-toastify";

import BlurCircle from "../components/BlurCircle";
import DateSelect from "../components/DateSelect";

const API_URL = "http://localhost:5000";

const MovieDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [show, setShow] = useState(null);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const [isFavorite, setIsFavorite] =
        useState(false);

    const [favoriteLoading, setFavoriteLoading] =
        useState(false);

    const [showTrailer, setShowTrailer] =
        useState(false);

    // ==========================================
    // GET MOVIE ID
    // ==========================================
    const movieId = id
        ? String(id)
        : "";

    // ==========================================
    // FETCH MOVIE + SHOWS
    // ==========================================
    const getMovie = async () => {
        if (!movieId) {
            setError("Movie ID is missing.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            console.log(
                "Movie ID from URL:",
                movieId
            );

            const response = await axios.get(
                `${API_URL}/api/show/all`
            );

            console.log(
                "All shows response:",
                response.data
            );

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message ||
                    "Unable to load shows."
                );
            }

            const shows = Array.isArray(
                response.data.shows
            )
                ? response.data.shows
                : [];

            // ==========================================
            // FIND SHOWS FOR THIS MOVIE
            // ==========================================

            const movieShows = shows.filter(
                (showItem) => {
                    if (!showItem) return false;

                    const movie =
                        showItem.movie;

                    const currentMovieId =
                        typeof movie === "object"
                            ? movie?._id ??
                              movie?.id
                            : movie;

                    return (
                        currentMovieId &&
                        String(currentMovieId) ===
                            movieId
                    );
                }
            );

            console.log(
                "Shows for current movie:",
                movieShows
            );

            if (movieShows.length === 0) {
                throw new Error(
                    "No shows found for this movie."
                );
            }

            // ==========================================
            // GET MOVIE OBJECT
            // ==========================================

            const firstMovie =
                movieShows[0]?.movie;

            let movie = null;

            if (
                firstMovie &&
                typeof firstMovie === "object"
            ) {
                movie = {
                    ...firstMovie,
                    _id:
                        firstMovie._id ??
                        firstMovie.id ??
                        movieId,
                };
            }

            if (!movie) {
                throw new Error(
                    "Movie information was not found."
                );
            }

            // ==========================================
            // BUILD DATE/TIME DATA
            // ==========================================

            const combinedDateTimes = {};

            movieShows.forEach(
                (showItem) => {
                    if (!showItem?.showDateTime) {
                        return;
                    }

                    const date = new Date(
                        showItem.showDateTime
                    )
                        .toISOString()
                        .split("T")[0];

                    if (!combinedDateTimes[date]) {
                        combinedDateTimes[date] =
                            [];
                    }

                    /*
                     * IMPORTANT:
                     * Store the actual SHOW _id.
                     *
                     * This is different from movie._id.
                     *
                     * movie._id = movie ID
                     * show._id  = show ID
                     */

                    combinedDateTimes[date].push({
                        showId:
                            showItem._id ??
                            showItem.id,

                        time:
                            showItem.showDateTime,

                        showDateTime:
                            showItem.showDateTime,

                        showPrice:
                            Number(
                                showItem.showPrice
                            ) || 0,
                    });
                }
            );

            // Sort dates
            Object.keys(
                combinedDateTimes
            ).forEach((date) => {
                combinedDateTimes[date].sort(
                    (a, b) =>
                        new Date(a.time) -
                        new Date(b.time)
                );
            });

            // ==========================================
            // TRAILER
            // ==========================================

            const trailer =
                movie.trailer ||
                movie.trailer_url ||
                movie.trailerUrl ||
                "";

            // ==========================================
            // SET SHOW
            // ==========================================

            setShow({
                movie,
                showData: movieShows[0],
                allShows: movieShows,
                dateTime:
                    combinedDateTimes,
                trailer,
            });

            console.log(
                "Final MovieDetail data:",
                {
                    movie,
                    dateTime:
                        combinedDateTimes,
                }
            );
        } catch (error) {
            console.error(
                "Error loading movie from MongoDB:",
                error
            );

            setShow(null);

            setError(
                error.response?.data?.message ||
                error.message ||
                "Failed to load movie."
            );
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // CHECK FAVORITE
    // ==========================================
    const checkFavorite = async () => {
        if (!movieId) return;

        const token =
            localStorage.getItem("token");

        if (!token) {
            setIsFavorite(false);
            return;
        }

        try {
            const response = await axios.get(
                `${API_URL}/api/user/favourites`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            const favorites =
                response.data?.favorites ||
                response.data?.movies ||
                [];

            const found = favorites.some(
                (favorite) => {
                    const favoriteId =
                        typeof favorite ===
                        "object"
                            ? favorite?._id ??
                              favorite?.id
                            : favorite;

                    return (
                        favoriteId &&
                        String(favoriteId) ===
                            movieId
                    );
                }
            );

            setIsFavorite(found);
        } catch (error) {
            console.error(
                "Favorite check error:",
                error.response?.data ||
                    error.message
            );

            setIsFavorite(false);
        }
    };

    // ==========================================
    // FAVORITE
    // ==========================================
    const handleFavorite = async () => {
        if (!movieId) {
            toast.error(
                "Movie ID is missing."
            );
            return;
        }

        const token =
            localStorage.getItem("token");

        if (!token) {
            toast.info(
                "Please login to add favorites."
            );

            navigate("/login");
            return;
        }

        try {
            setFavoriteLoading(true);

            console.log(
                "Adding/removing favorite for movie:",
                movieId
            );

            /*
             * IMPORTANT FIX:
             *
             * OLD:
             * /api/user/favourite/123
             *
             * NEW:
             * /api/user/favourite/${movieId}
             */

            const response = await axios.post(
                `${API_URL}/api/user/favourite/${encodeURIComponent(
                    movieId
                )}`,
                {},
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                        "Content-Type":
                            "application/json",
                    },
                }
            );

            console.log(
                "Favorite response:",
                response.data
            );

            if (response.data?.success) {
                const newStatus =
                    response.data.isFavorite ??
                    response.data.favourite ??
                    response.data.favorite ??
                    !isFavorite;

                setIsFavorite(newStatus);

                toast.success(
                    response.data.message ||
                        (newStatus
                            ? "Added to favorites"
                            : "Removed from favorites")
                );

                window.dispatchEvent(
                    new Event(
                        "favoritesUpdated"
                    )
                );
            } else {
                throw new Error(
                    response.data?.message ||
                        "Favorite operation failed."
                );
            }
        } catch (error) {
            console.error(
                "Favorite error:",
                error.response?.data ||
                    error.message
            );

            toast.error(
                error.response?.data?.message ||
                    error.message ||
                    "Unable to update favorite."
            );
        } finally {
            setFavoriteLoading(false);
        }
    };

    // ==========================================
    // INITIAL LOAD
    // ==========================================
    useEffect(() => {
        getMovie();
        checkFavorite();
    }, [movieId]);

    // ==========================================
    // LOADING
    // ==========================================
    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-gray-700 border-t-primary rounded-full animate-spin mx-auto" />

                    <p className="mt-4 text-gray-400">
                        Loading movie...
                    </p>
                </div>
            </div>
        );
    }

    // ==========================================
    // ERROR
    // ==========================================
    if (error || !show?.movie) {
        return (
            <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center px-6">
                <div className="text-center max-w-lg">
                    <h1 className="text-3xl font-semibold text-red-400">
                        Movie not found
                    </h1>

                    <p className="mt-4 text-gray-400">
                        {error ||
                            "Unable to load this movie."}
                    </p>

                    <p className="mt-2 text-xs text-gray-600 break-all">
                        Movie ID: {movieId}
                    </p>

                    <button
                        onClick={() =>
                            navigate("/movies")
                        }
                        className="mt-6 px-6 py-3 bg-primary rounded-full hover:bg-primary/80 transition"
                    >
                        Back to Movies
                    </button>
                </div>
            </div>
        );
    }

    const movie = show.movie;

    const title =
        movie.title ||
        movie.name ||
        "Untitled Movie";

    const poster =
        movie.poster_path ||
        movie.poster ||
        movie.image ||
        "";

    const backdrop =
        movie.backdrop_path ||
        movie.backdrop ||
        poster;

    const rating =
        Number(movie.vote_average) || 0;

    const runtime =
        Number(movie.runtime) || 0;

    const genres = Array.isArray(
        movie.genres
    )
        ? movie.genres
        : [];

    const casts = Array.isArray(
        movie.casts
    )
        ? movie.casts
        : Array.isArray(movie.cast)
        ? movie.cast
        : [];

    const releaseDate =
        movie.release_date ||
        movie.releaseDate ||
        "";

    const overview =
        movie.overview ||
        movie.description ||
        "No description available.";

    // ==========================================
    // PAGE
    // ==========================================
    return (
        <div className="min-h-screen bg-[#09090b] text-white">
            {/* ===================================== */}
            {/* HERO */}
            {/* ===================================== */}

            <div className="relative min-h-162.5 overflow-hidden">
                {/* BACKGROUND */}
                <div className="absolute inset-0">
                    {backdrop && (
                        <img
                            src={backdrop}
                            alt=""
                            className="w-full h-full object-cover opacity-30 blur-sm"
                        />
                    )}

                    <div className="absolute inset-0 bg-linear-to-t from-[#09090b] via-[#09090b]/70 to-black/30" />

                    <div className="absolute inset-0 bg-black/30" />
                </div>

                <BlurCircle
                    top="100px"
                    left="-100px"
                />

                <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-32 pb-16">
                    {/* BACK BUTTON */}
                    <button
                        onClick={() =>
                            navigate("/movies")
                        }
                        className="flex items-center gap-2 text-gray-300 hover:text-white mb-10 transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Movies
                    </button>

                    <div className="grid md:grid-cols-[280px_1fr] gap-10 items-end">
                        {/* POSTER */}
                        <div className="mx-auto md:mx-0 w-60 md:w-70">
                            <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10">
                                {poster ? (
                                    <img
                                        src={poster}
                                        alt={title}
                                        className="w-full aspect-2/3 object-cover"
                                    />
                                ) : (
                                    <div className="w-full aspect-2/3 bg-gray-900 flex items-center justify-center text-gray-500">
                                        No Poster
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* INFORMATION */}
                        <div>
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                {genres.map(
                                    (
                                        genre,
                                        index
                                    ) => {
                                        const genreName =
                                            typeof genre ===
                                            "object"
                                                ? genre.name
                                                : genre;

                                        return (
                                            <span
                                                key={`${genreName}-${index}`}
                                                className="px-3 py-1 rounded-full bg-white/10 text-sm text-gray-300"
                                            >
                                                {
                                                    genreName
                                                }
                                            </span>
                                        );
                                    }
                                )}
                            </div>

                            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                                {title}
                            </h1>

                            <div className="flex flex-wrap items-center gap-5 mt-6 text-gray-300">
                                <span className="flex items-center gap-2">
                                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />

                                    {rating.toFixed(
                                        1
                                    )}
                                </span>

                                {runtime > 0 && (
                                    <span className="flex items-center gap-2">
                                        <Clock className="w-5 h-5" />

                                        {runtime} min
                                    </span>
                                )}

                                {releaseDate && (
                                    <span className="flex items-center gap-2">
                                        <CalendarDays className="w-5 h-5" />

                                        {releaseDate}
                                    </span>
                                )}
                            </div>

                            <p className="mt-7 text-gray-300 max-w-3xl leading-7">
                                {overview}
                            </p>

                            {/* BUTTONS */}
                            <div className="flex flex-wrap gap-4 mt-8">
                                <button
                                    onClick={() => {
                                        document
                                            .getElementById(
                                                "dateSelect"
                                            )
                                            ?.scrollIntoView(
                                                {
                                                    behavior:
                                                        "smooth",
                                                }
                                            );
                                    }}
                                    className="flex items-center gap-2 px-7 py-3 rounded-full bg-primary hover:bg-primary/80 transition font-medium"
                                >
                                    <Ticket className="w-5 h-5" />

                                    Buy Tickets
                                </button>

                                <button
                                    onClick={
                                        handleFavorite
                                    }
                                    disabled={
                                        favoriteLoading
                                    }
                                    className={`flex items-center gap-2 px-6 py-3 rounded-full border transition ${
                                        isFavorite
                                            ? "border-red-500 bg-red-500/10 text-red-400"
                                            : "border-white/20 hover:bg-white/10"
                                    }`}
                                >
                                    <Heart
                                        className={`w-5 h-5 ${
                                            isFavorite
                                                ? "fill-red-500"
                                                : ""
                                        }`}
                                    />

                                    {favoriteLoading
                                        ? "Please wait..."
                                        : isFavorite
                                        ? "Favorite"
                                        : "Favorite"}
                                </button>

                                {show.trailer && (
                                    <button
                                        onClick={() =>
                                            setShowTrailer(
                                                true
                                            )
                                        }
                                        className="flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 hover:bg-white/10 transition"
                                    >
                                        <Play className="w-5 h-5 fill-current" />

                                        Trailer
                                    </button>
                                )}
                            </div>

                            {/* DEBUG ID */}
                            <p className="mt-6 text-xs text-gray-600">
                                Movie ID:{" "}
                                {String(movieId)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===================================== */}
            {/* CAST */}
            {/* ===================================== */}

            {casts.length > 0 && (
                <section className="max-w-7xl mx-auto px-6 md:px-10 py-10">
                    <h2 className="text-2xl font-semibold mb-6">
                        Cast
                    </h2>

                    <div className="flex flex-wrap gap-3">
                        {casts.map(
                            (cast, index) => {
                                const castName =
                                    typeof cast ===
                                    "object"
                                        ? cast.name ||
                                          cast.original_name
                                        : cast;

                                return (
                                    <span
                                        key={`${castName}-${index}`}
                                        className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300"
                                    >
                                        {castName}
                                    </span>
                                );
                            }
                        )}
                    </div>
                </section>
            )}

            {/* ===================================== */}
            {/* DATE SELECT */}
            {/* ===================================== */}

            <section
                id="dateSelect"
                className="max-w-7xl mx-auto px-6 md:px-10 py-12"
            >
                <div className="mb-7">
                    <h2 className="text-2xl md:text-3xl font-semibold">
                        Select Date & Time
                    </h2>

                    <p className="text-gray-400 mt-2">
                        Choose your preferred showtime.
                    </p>
                </div>

                {Object.keys(
                    show.dateTime || {}
                ).length > 0 ? (
                    <DateSelect
                        dateTime={
                            show.dateTime
                        }
                        id={movieId}
                    />
                ) : (
                    <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-gray-400">
                        No showtime available
                        for this movie.
                    </div>
                )}
            </section>

            {/* ===================================== */}
            {/* TRAILER MODAL */}
            {/* ===================================== */}

            {showTrailer &&
                show.trailer && (
                    <div
                        className="fixed inset-0 z-100 bg-black/90 flex items-center justify-center p-5"
                        onClick={() =>
                            setShowTrailer(false)
                        }
                    >
                        <div
                            className="w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden"
                            onClick={(event) =>
                                event.stopPropagation()
                            }
                        >
                            <iframe
                                src={show.trailer}
                                title={`${title} Trailer`}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>

                        <button
                            onClick={() =>
                                setShowTrailer(false)
                            }
                            className="absolute top-6 right-6 text-white text-3xl"
                        >
                            ×
                        </button>
                    </div>
                )}
        </div>
    );
};

export default MovieDetail;