
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import BlurCircle from "../components/BlurCircle";
import {
    PlayCircleIcon,
    StarIcon,
    Heart,
} from "lucide-react";

import DateSelect from "../components/DateSelect";
import timeFormat from "../lib/timeFormat";
import MovieCard from "../components/MovieCard";

// =====================================================
// API BASE URL
// =====================================================
const API_BASE_URL = "http://localhost:5000";

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Get movie ID safely
const getMovieId = (movie) => {
    if (!movie) return "";

    return String(
        movie._id ??
        movie.id ??
        movie.movieId ??
        ""
    );
};

// Convert poster path to usable URL
const getPosterUrl = (movie) => {
    if (!movie) return "/fallback.jpg";

    const poster =
        movie.poster_path ||
        movie.poster ||
        movie.image ||
        movie.posterUrl ||
        "";

    if (!poster) {
        return "/fallback.jpg";
    }

    if (
        poster.startsWith("http://") ||
        poster.startsWith("https://") ||
        poster.startsWith("data:")
    ) {
        return poster;
    }

    return `https://image.tmdb.org/t/p/w500${poster}`;
};

// Convert backdrop path to usable URL
const getBackdropUrl = (movie) => {
    if (!movie) return "";

    const backdrop =
        movie.backdrop_path ||
        movie.backdrop ||
        movie.backdropUrl ||
        "";

    if (!backdrop) return "";

    if (
        backdrop.startsWith("http://") ||
        backdrop.startsWith("https://")
    ) {
        return backdrop;
    }

    return `https://image.tmdb.org/t/p/original${backdrop}`;
};

// Normalize genres
const getGenreNames = (movie) => {
    if (!movie) return [];

    const rawGenres =
        movie.genres ||
        movie.genre ||
        [];

    if (!Array.isArray(rawGenres)) {
        return [];
    }

    return rawGenres
        .map((genre) => {
            if (typeof genre === "string") {
                return genre.trim().toLowerCase();
            }

            if (genre && typeof genre === "object") {
                return String(
                    genre.name ||
                    genre.title ||
                    genre.genre ||
                    ""
                )
                    .trim()
                    .toLowerCase();
            }

            return "";
        })
        .filter(Boolean);
};

// Normalize cast
const getCastList = (movie) => {
    if (!movie) return [];

    const rawCast =
        movie.casts ||
        movie.cast ||
        movie.credits?.cast ||
        [];

    if (!Array.isArray(rawCast)) {
        return [];
    }

    return rawCast
        .map((cast) => {
            if (typeof cast === "string") {
                return {
                    id: "",
                    name: cast,
                    profile_path: "",
                };
            }

            if (cast && typeof cast === "object") {
                return {
                    id: cast.id || cast._id || "",
                    name:
                        cast.name ||
                        cast.original_name ||
                        cast.character ||
                        "",
                    profile_path:
                        cast.profile_path ||
                        cast.profile ||
                        cast.image ||
                        cast.imageUrl ||
                        "",
                };
            }

            return null;
        })
        .filter((cast) => cast && cast.name);
};

// Get trailer URL
const getTrailerUrl = (movie) => {
    if (!movie) return null;

    return (
        movie.trailer ||
        movie.trailer_url ||
        movie.trailerUrl ||
        movie.videoUrl ||
        movie.video_url ||
        null
    );
};

// Convert trailer URL into embeddable URL
const getEmbedUrl = (url) => {
    if (!url) return null;

    let cleanUrl = String(url).trim();

    // YouTube watch URL
    if (cleanUrl.includes("youtube.com/watch?v=")) {
        const videoId = cleanUrl.split("v=")[1]?.split("&")[0];

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}`;
        }
    }

    // YouTube short URL
    if (cleanUrl.includes("youtu.be/")) {
        const videoId = cleanUrl.split("youtu.be/")[1]?.split("?")[0];

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}`;
        }
    }

    // Already embed URL
    if (cleanUrl.includes("youtube.com/embed/")) {
        return cleanUrl;
    }

    return cleanUrl;
};

// =====================================================
// INTERACTIVE STAR RATING
// =====================================================
const StarRating = ({ value, onChange, disabled }) => {
    const [hover, setHover] = useState(0);

    const display = hover || value;

    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    onMouseEnter={() => {
                        if (!disabled) {
                            setHover(n);
                        }
                    }}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => {
                        if (!disabled) {
                            onChange(n);
                        }
                    }}
                    className={`transition-all ${
                        disabled
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:scale-110 active:scale-95"
                    }`}
                    aria-label={`Rate ${n} stars`}
                >
                    <StarIcon
                        size={26}
                        className={`transition ${
                            n <= display
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-600"
                        }`}
                    />
                </button>
            ))}
        </div>
    );
};

// =====================================================
// MOVIE DETAIL COMPONENT
// =====================================================
const MovieDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const auth = useAuth();

    const user = auth?.user;
    const userToken =
        auth?.userToken ||
        localStorage.getItem("userToken") ||
        localStorage.getItem("token");

    // =================================================
    // STATE
    // =================================================

    const [movie, setMovie] = useState(null);
    const [allMovies, setAllMovies] = useState([]);

    const [showData, setShowData] = useState([]);
    const [dateTime, setDateTime] = useState({});

    const [loading, setLoading] = useState(true);

    const [showTrailer, setShowTrailer] = useState(false);

    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);

    // Rating
    const [userRating, setUserRating] = useState(0);
    const [avgRating, setAvgRating] = useState(0);
    const [totalRatings, setTotalRatings] = useState(0);
    const [ratingLoading, setRatingLoading] = useState(false);
    const [ratingMessage, setRatingMessage] = useState("");

    // =================================================
    // SCROLL TOP WHEN MOVIE ID CHANGES
    // =================================================
    useEffect(() => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }, [id]);

    // =================================================
    // CHECK FAVOURITE
    // =================================================
    const checkFavourite = async (currentMovie) => {
        try {
            if (!currentMovie) {
                setIsFavorite(false);
                return;
            }

            if (!userToken || !user) {
                setIsFavorite(false);
                return;
            }

            const response = await fetch(
                `${API_BASE_URL}/user/me`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                    },
                }
            );

            if (!response.ok) {
                setIsFavorite(false);
                return;
            }

            const data = await response.json();

            const favourites =
                data?.user?.favourites ||
                data?.favourites ||
                [];

            const favouriteIds = Array.isArray(favourites)
                ? favourites.map((item) => {
                      if (
                          typeof item === "object" &&
                          item !== null
                      ) {
                          return String(
                              item._id ||
                              item.id ||
                              item.movieId ||
                              ""
                          );
                      }

                      return String(item);
                  })
                : [];

            const currentMovieId = getMovieId(currentMovie);

            setIsFavorite(
                favouriteIds.includes(
                    String(currentMovieId)
                )
            );
        } catch (error) {
            console.error(
                "Error checking favourite:",
                error
            );

            setIsFavorite(false);
        }
    };

    // =================================================
    // FETCH RATINGS
    // =================================================
    const fetchRatings = async (movieId) => {
        if (!movieId) return;

        try {
            const headers = {};

            if (userToken) {
                headers.Authorization = `Bearer ${userToken}`;
            }

            const response = await fetch(
                `${API_BASE_URL}/movie/${movieId}/ratings`,
                {
                    method: "GET",
                    headers,
                }
            );

            // IMPORTANT:
            // A missing ratings route must NOT break
            // the Movie Detail page.
            if (!response.ok) {
                console.warn(
                    `Ratings endpoint returned ${response.status}`
                );

                return;
            }

            const data = await response.json();

            if (!data?.success) {
                return;
            }

            setAvgRating(
                Number(
                    data.averageRating ??
                    data.avgRating ??
                    0
                ) || 0
            );

            setTotalRatings(
                Number(
                    data.totalRatings ??
                    data.total ??
                    0
                ) || 0
            );

            setUserRating(
                Number(
                    data.userRating ??
                    data.rating ??
                    0
                ) || 0
            );
        } catch (error) {
            console.warn(
                "Could not fetch ratings:",
                error.message
            );
        }
    };

    // =================================================
    // SUBMIT RATING
    // =================================================
    const submitRating = async (value) => {
        if (!userToken || !user) {
            alert("Please login to rate this movie.");

            navigate("/login");

            return;
        }

        if (!id) {
            return;
        }

        if (ratingLoading) {
            return;
        }

        setRatingLoading(true);
        setRatingMessage("");

        try {
            const response = await fetch(
                `${API_BASE_URL}/movie/${id}/rate`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${userToken}`,
                    },
                    body: JSON.stringify({
                        rating: Number(value),
                    }),
                }
            );

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    `Rating request failed (${response.status})`
                );
            }

            setUserRating(Number(value));

            if (
                data.averageRating !== undefined
            ) {
                setAvgRating(
                    Number(data.averageRating) || 0
                );
            }

            if (
                data.totalRatings !== undefined
            ) {
                setTotalRatings(
                    Number(data.totalRatings) || 0
                );
            }

            setRatingMessage(
                `Thanks! You rated this ${value} star${
                    value > 1 ? "s" : ""
                }.`
            );

            setTimeout(() => {
                setRatingMessage("");
            }, 3000);
        } catch (error) {
            console.error(
                "Rating error:",
                error
            );

            alert(
                error.message ||
                "Unable to submit rating."
            );
        } finally {
            setRatingLoading(false);
        }
    };

    // =================================================
    // BUILD DATE/TIME DATA FROM SHOWS
    // =================================================
    const buildDateTimes = (shows) => {
        const combined = {};

        if (!Array.isArray(shows)) {
            return combined;
        }

        shows.forEach((showItem) => {
            // -----------------------------------------
            // dateTimes object
            // -----------------------------------------
            if (
                showItem?.dateTimes &&
                typeof showItem.dateTimes === "object"
            ) {
                Object.entries(
                    showItem.dateTimes
                ).forEach(([date, times]) => {
                    if (!combined[date]) {
                        combined[date] = [];
                    }

                    if (Array.isArray(times)) {
                        times.forEach((time) => {
                            if (
                                !combined[date].includes(
                                    time
                                )
                            ) {
                                combined[date].push(
                                    time
                                );
                            }
                        });
                    }
                });
            }

            // -----------------------------------------
            // showDateTime
            // -----------------------------------------
            if (showItem?.showDateTime) {
                const dateObject = new Date(
                    showItem.showDateTime
                );

                if (
                    !Number.isNaN(
                        dateObject.getTime()
                    )
                ) {
                    const date =
                        dateObject
                            .toISOString()
                            .split("T")[0];

                    const time =
                        dateObject
                            .toTimeString()
                            .slice(0, 5);

                    if (!combined[date]) {
                        combined[date] = [];
                    }

                    if (
                        !combined[date].includes(
                            time
                        )
                    ) {
                        combined[date].push(time);
                    }
                }
            }
        });

        Object.keys(combined).forEach((date) => {
            combined[date] = [
                ...new Set(combined[date]),
            ].sort();
        });

        return combined;
    };

    // =================================================
    // FIND MOVIE INSIDE SHOW OBJECT
    // =================================================
    const getMovieFromShow = (showItem) => {
        if (!showItem) return null;

        // Most common structure
        if (
            showItem.movie &&
            typeof showItem.movie === "object"
        ) {
            return showItem.movie;
        }

        // Sometimes backend can return movieId
        const showMovieId =
            showItem.movieId ||
            showItem.movie_id ||
            showItem.movie;

        if (!showMovieId) {
            return null;
        }

        return null;
    };

    // =================================================
    // GET MOVIE DETAILS
    // =================================================
    const getMovieDetails = async () => {
        try {
            setLoading(true);

            let fetchedMovies = [];
            let fetchedShows = [];

            // =================================================
            // 1. FETCH ALL MOVIES
            // =================================================
            try {
                const moviesResponse = await fetch(
                    `${API_BASE_URL}/movie/all`
                );

                if (moviesResponse.ok) {
                    const moviesJson =
                        await moviesResponse.json();

                    if (
                        Array.isArray(
                            moviesJson?.movies
                        )
                    ) {
                        fetchedMovies =
                            moviesJson.movies;
                    } else if (
                        Array.isArray(
                            moviesJson?.data
                        )
                    ) {
                        fetchedMovies =
                            moviesJson.data;
                    } else if (
                        Array.isArray(
                            moviesJson
                        )
                    ) {
                        fetchedMovies =
                            moviesJson;
                    }
                }
            } catch (error) {
                console.warn(
                    "Could not fetch movies:",
                    error.message
                );
            }

            // =================================================
            // 2. FETCH ALL SHOWS
            // =================================================
            try {
                const showsResponse = await fetch(
                    `${API_BASE_URL}/show/all`
                );

                if (showsResponse.ok) {
                    const showsJson =
                        await showsResponse.json();

                    if (
                        Array.isArray(
                            showsJson?.shows
                        )
                    ) {
                        fetchedShows =
                            showsJson.shows;
                    }
                }
            } catch (error) {
                console.warn(
                    "Could not fetch shows:",
                    error.message
                );
            }

            // =================================================
            // 3. ADD MOVIES FOUND INSIDE SHOWS
            // =================================================
            const movieMap = new Map();

            fetchedMovies.forEach((item) => {
                const movieId =
                    getMovieId(item);

                if (movieId) {
                    movieMap.set(
                        movieId,
                        item
                    );
                }
            });

            fetchedShows.forEach((showItem) => {
                const movieFromShow =
                    getMovieFromShow(
                        showItem
                    );

                if (movieFromShow) {
                    const movieId =
                        getMovieId(
                            movieFromShow
                        );

                    if (
                        movieId &&
                        !movieMap.has(movieId)
                    ) {
                        movieMap.set(
                            movieId,
                            movieFromShow
                        );
                    }
                }
            });

            const combinedMovies =
                Array.from(
                    movieMap.values()
                );

            setAllMovies(combinedMovies);

            // =================================================
            // 4. FIND CURRENT MOVIE
            // =================================================
            let currentMovie =
                combinedMovies.find(
                    (item) =>
                        getMovieId(item) ===
                        String(id)
                );

            // =================================================
            // 5. IF NOT FOUND IN /movie/all,
            //    TRY TO FIND IT INSIDE SHOWS
            // =================================================
            if (!currentMovie) {
                const matchingShow =
                    fetchedShows.find(
                        (showItem) => {
                            const showMovie =
                                getMovieFromShow(
                                    showItem
                                );

                            if (!showMovie) {
                                return false;
                            }

                            return (
                                getMovieId(
                                    showMovie
                                ) ===
                                String(id)
                            );
                        }
                    );

                if (matchingShow) {
                    currentMovie =
                        getMovieFromShow(
                            matchingShow
                        );
                }
            }

            // =================================================
            // IMPORTANT FIX:
            // DO NOT REQUIRE A SHOW TO DISPLAY MOVIE DETAILS
            // =================================================
            if (!currentMovie) {
                console.error(
                    "Movie not found:",
                    id
                );

                setMovie(null);
                setShowData([]);
                setDateTime({});

                return;
            }

            // =================================================
            // 6. FIND ALL SHOWS FOR CURRENT MOVIE
            // =================================================
            const currentMovieShows =
                fetchedShows.filter(
                    (showItem) => {
                        const showMovie =
                            getMovieFromShow(
                                showItem
                            );

                        if (!showMovie) {
                            return false;
                        }

                        return (
                            getMovieId(
                                showMovie
                            ) ===
                            getMovieId(
                                currentMovie
                            )
                        );
                    }
                );

            // =================================================
            // 7. BUILD DATE/TIME
            // =================================================
            const combinedDateTimes =
                buildDateTimes(
                    currentMovieShows
                );

            // =================================================
            // 8. SET MOVIE
            // =================================================
            setMovie(currentMovie);

            setShowData(
                currentMovieShows
            );

            setDateTime(
                combinedDateTimes
            );

            // =================================================
            // 9. INITIAL MOVIE RATING
            // =================================================
            setAvgRating(
                Number(
                    currentMovie.userRatingAvg ||
                    currentMovie.averageRating ||
                    currentMovie.rating ||
                    0
                ) || 0
            );

            setTotalRatings(
                Number(
                    currentMovie.userRatingCount ||
                    currentMovie.totalRatings ||
                    0
                ) || 0
            );

            // =================================================
            // 10. CHECK FAVOURITE
            // =================================================
            await checkFavourite(
                currentMovie
            );

            // =================================================
            // 11. FETCH RATINGS
            // =================================================
            await fetchRatings(
                getMovieId(currentMovie)
            );
        } catch (error) {
            console.error(
                "Error loading movie details:",
                error
            );

            setMovie(null);
        } finally {
            setLoading(false);
        }
    };

    // =================================================
    // LOAD MOVIE WHEN URL ID CHANGES
    // =================================================
    useEffect(() => {
        if (!id) {
            setMovie(null);
            setLoading(false);
            return;
        }

        getMovieDetails();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // =================================================
    // TOGGLE FAVOURITE
    // =================================================
    const toggleFavorite = async () => {
        try {
            if (!movie) {
                alert(
                    "Movie information is not available."
                );

                return;
            }

            if (!userToken || !user) {
                alert(
                    "Please login first to add movies to your favourites."
                );

                navigate("/login");

                return;
            }

            if (favoriteLoading) {
                return;
            }

            const movieId =
                getMovieId(movie);

            if (!movieId) {
                alert(
                    "Movie ID not found."
                );

                return;
            }

            setFavoriteLoading(true);

            const response = await fetch(
                `${API_BASE_URL}/user/favourite/${movieId}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                        "Content-Type":
                            "application/json",
                    },
                }
            );

            let data = {};

            try {
                data =
                    await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to update favourite."
                );
            }

            setIsFavorite(
                data.isFavourite === true ||
                data.isFavorite === true ||
                data.favourite === true
            );

            window.dispatchEvent(
                new Event(
                    "favoritesUpdated"
                )
            );

            if (data.message) {
                alert(data.message);
            }
        } catch (error) {
            console.error(
                "Favourite request error:",
                error
            );

            alert(
                error.message ||
                "Unable to update favourite. Please try again."
            );
        } finally {
            setFavoriteLoading(false);
        }
    };

    // =================================================
    // CONTENT-BASED RECOMMENDATIONS
    // =================================================
    const recommendations = useMemo(() => {
        if (!movie || !Array.isArray(allMovies)) {
            return [];
        }

        const currentMovieId =
            getMovieId(movie);

        const currentGenres =
            getGenreNames(movie);

        if (currentGenres.length === 0) {
            return allMovies
                .filter(
                    (item) =>
                        getMovieId(item) &&
                        getMovieId(item) !==
                            currentMovieId
                )
                .slice(0, 4);
        }

        const scoredMovies =
            allMovies
                .filter((item) => {
                    const itemId =
                        getMovieId(item);

                    return (
                        itemId &&
                        itemId !==
                            currentMovieId
                    );
                })
                .map((item) => {
                    const itemGenres =
                        getGenreNames(item);

                    // Number of genres in common
                    const commonGenres =
                        currentGenres.filter(
                            (genre) =>
                                itemGenres.includes(
                                    genre
                                )
                        );

                    let score =
                        commonGenres.length;

                    // Small bonus when movie
                    // has multiple matching genres
                    if (
                        commonGenres.length >=
                        2
                    ) {
                        score += 1;
                    }

                    // Rating bonus
                    const rating =
                        Number(
                            item.vote_average ||
                            item.userRatingAvg ||
                            item.averageRating ||
                            item.rating ||
                            0
                        );

                    if (rating >= 7) {
                        score += 0.5;
                    }

                    return {
                        movie: item,
                        score,
                        commonGenres,
                    };
                })
                .filter(
                    (item) =>
                        item.score > 0
                )
                .sort(
                    (a, b) =>
                        b.score - a.score
                );

        return scoredMovies
            .slice(0, 4)
            .map(
                (item) => item.movie
            );
    }, [movie, allMovies]);

    // =================================================
    // LOADING SCREEN
    // =================================================
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <h1 className="text-xl text-gray-300">
                    Loading movie...
                </h1>
            </div>
        );
    }

    // =================================================
    // MOVIE NOT FOUND
    // =================================================
    if (!movie) {
        return (
            <div className="flex flex-col items-center justify-center h-screen px-6 text-center">
                <h1 className="text-xl text-white">
                    Movie not available
                </h1>

                <p className="text-gray-400 mt-2">
                    We could not find this movie.
                </p>

                <button
                    onClick={() => {
                        navigate("/movies");

                        window.scrollTo(
                            0,
                            0
                        );
                    }}
                    className="mt-5 px-6 py-2 bg-primary rounded-md"
                >
                    Back to Movies
                </button>
            </div>
        );
    }

    // =================================================
    // MOVIE DATA
    // =================================================

    const posterUrl =
        getPosterUrl(movie);

    const backdropUrl =
        getBackdropUrl(movie);

    const trailerUrl =
        getTrailerUrl(movie);

    const embedUrl =
        getEmbedUrl(trailerUrl);

    const runtime = movie.runtime
        ? timeFormat(movie.runtime)
        : "N/A";

    const genreNames =
        getGenreNames(movie);

    const genres =
        genreNames.length > 0
            ? genreNames
                  .map(
                      (genre) =>
                          genre.charAt(0)
                              .toUpperCase() +
                          genre.slice(1)
                  )
                  .join(", ")
            : "N/A";

    const releaseYear =
        movie.release_date
            ? String(
                  movie.release_date
              ).split("-")[0]
            : movie.releaseDate
              ? String(
                    movie.releaseDate
                ).split("-")[0]
              : "N/A";

    const casts =
        getCastList(movie);

    const hasShows =
        Object.keys(dateTime).length > 0;

    // =================================================
    // RENDER
    // =================================================

    return (
        <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-50 pb-20 overflow-hidden">

            {/* =================================================
                BACKDROP
            ================================================= */}
            {backdropUrl && (
                <div className="absolute top-0 left-0 w-full h-150 -z-10 overflow-hidden">
                    <img
                        src={backdropUrl}
                        alt=""
                        className="w-full h-full object-cover opacity-15 blur-sm"
                        onError={(event) => {
                            event.currentTarget.style.display =
                                "none";
                        }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/80 to-black" />
                </div>
            )}

            {/* =================================================
                TOP SECTION
            ================================================= */}
            <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto">

                {/* =================================================
                    POSTER
                ================================================= */}
                <div className="max-md:mx-auto w-60 md:w-70 shrink-0">
                    <div
                        className="
                            w-full
                            h-104
                            bg-gray-950
                            rounded-xl
                            overflow-hidden
                            shadow-2xl
                            border
                            border-white/10
                            flex
                            items-center
                            justify-center
                        "
                    >
                        <img
                            src={posterUrl}
                            alt={
                                movie.title ||
                                "Movie"
                            }
                            className="
                                max-w-full
                                max-h-full
                                w-auto
                                h-auto
                                object-contain
                                object-center
                            "
                            onError={(event) => {
                                event.currentTarget.onerror =
                                    null;

                                event.currentTarget.src =
                                    "/fallback.jpg";
                            }}
                        />
                    </div>
                </div>

                {/* =================================================
                    MOVIE INFO
                ================================================= */}
                <div className="relative flex flex-col gap-3 flex-1">
                    <BlurCircle
                        top="-100px"
                        left="-100px"
                    />

                    {/* LANGUAGE */}
                    <p className="text-primary">
                        {movie.language ||
                            movie.original_language ||
                            "Nepali"}
                    </p>

                    {/* TITLE */}
                    <h1 className="text-4xl font-semibold max-w-3xl text-balance">
                        {movie.title ||
                            "Untitled Movie"}
                    </h1>

                    {/* =================================================
                        RATING SECTION
                    ================================================= */}
                    <div className="flex flex-col gap-3 mt-1">

                        {/* Average */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <StarIcon className="w-5 h-5 text-primary fill-primary" />

                                <span className="text-lg font-semibold text-white">
                                    {avgRating >
                                    0
                                        ? Number(
                                              avgRating
                                          ).toFixed(
                                              1
                                          )
                                        : "N/A"}
                                </span>

                                <span className="text-gray-400 text-sm">
                                    User Rating
                                </span>
                            </div>

                            {totalRatings >
                                0 && (
                                <span className="text-xs text-gray-500 bg-gray-800/60 border border-gray-700 px-2.5 py-1 rounded-full">
                                    {
                                        totalRatings
                                    }{" "}
                                    {totalRatings ===
                                    1
                                        ? "vote"
                                        : "votes"}
                                </span>
                            )}
                        </div>

                        {/* User rating */}
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm text-gray-400">
                                {userRating >
                                0
                                    ? "Your rating:"
                                    : "Rate this movie:"}
                            </span>

                            <StarRating
                                value={
                                    userRating
                                }
                                onChange={
                                    submitRating
                                }
                                disabled={
                                    ratingLoading
                                }
                            />

                            {userRating >
                                0 && (
                                <span className="text-sm font-medium text-primary">
                                    {
                                        userRating
                                    }
                                    /5
                                </span>
                            )}

                            {ratingLoading && (
                                <span className="text-xs text-gray-500">
                                    Saving...
                                </span>
                            )}
                        </div>

                        {ratingMessage && (
                            <p className="text-xs text-emerald-400">
                                ✓{" "}
                                {
                                    ratingMessage
                                }
                            </p>
                        )}
                    </div>

                    {/* OVERVIEW */}
                    <p className="text-gray-400 mt-2 text-sm leading-relaxed max-w-3xl">
                        {movie.overview ||
                            "No description available."}
                    </p>

                    {/* META */}
                    <p className="text-gray-300">
                        {runtime} • {genres} •{" "}
                        {releaseYear}
                    </p>

                    {/* =================================================
                        BUTTONS
                    ================================================= */}
                    <div className="flex items-center flex-wrap gap-4 mt-4">

                        {/* TRAILER */}
                        {embedUrl && (
                            <button
                                onClick={() =>
                                    setShowTrailer(
                                        true
                                    )
                                }
                                className="flex items-center gap-2 px-7 py-3 text-sm bg-gray-800 hover:bg-gray-900 transition rounded-md font-medium cursor-pointer active:scale-95"
                            >
                                <PlayCircleIcon className="w-5 h-5" />

                                Watch Trailer
                            </button>
                        )}

                        {/* BUY TICKETS */}
                        {hasShows ? (
                            <a
                                href="#dateSelect"
                                className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer active:scale-95"
                            >
                                Buy Tickets
                            </a>
                        ) : (
                            <button
                                disabled
                                className="px-10 py-3 text-sm bg-gray-700 text-gray-400 rounded-md font-medium cursor-not-allowed"
                                title="No shows are currently available"
                            >
                                No Shows Available
                            </button>
                        )}

                        {/* FAVOURITE */}
                        <button
                            type="button"
                            onClick={
                                toggleFavorite
                            }
                            disabled={
                                favoriteLoading
                            }
                            title={
                                isFavorite
                                    ? "Remove from favourites"
                                    : "Add to favourites"
                            }
                            className={`
                                p-2.5 rounded-full transition cursor-pointer active:scale-95
                                ${
                                    isFavorite
                                        ? "bg-primary text-white"
                                        : "bg-gray-700 text-white"
                                }
                                ${
                                    favoriteLoading
                                        ? "opacity-60 cursor-not-allowed"
                                        : ""
                                }
                            `}
                        >
                            <Heart
                                className="w-5 h-5"
                                fill={
                                    isFavorite
                                        ? "currentColor"
                                        : "none"
                                }
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* =================================================
                CAST
            ================================================= */}
            {casts.length > 0 && (
                <>
                    <p className="text-lg font-medium mt-20">
                        Cast
                    </p>

                    <div className="overflow-x-auto no-scrollbar mt-8 pb-4">
                        <div className="flex items-center gap-5 w-max px-4">

                            {casts
                                .slice(0, 12)
                                .map(
                                    (
                                        cast,
                                        index
                                    ) => {
                                        const image =
                                            cast.profile_path;

                                        const castImage =
                                            image
                                                ? image.startsWith(
                                                      "http://"
                                                  ) ||
                                                  image.startsWith(
                                                      "https://"
                                                  )
                                                    ? image
                                                    : `https://image.tmdb.org/t/p/w200${image}`
                                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                      cast.name
                                                  )}&size=200&background=1e40af&color=fff`;

                                        return (
                                            <div
                                                key={
                                                    cast.id ||
                                                    `${cast.name}-${index}`
                                                }
                                                className="flex flex-col items-center text-center w-24"
                                            >
                                                <img
                                                    src={
                                                        castImage
                                                    }
                                                    alt={
                                                        cast.name ||
                                                        "Cast"
                                                    }
                                                    className="rounded-full h-20 w-20 object-cover border border-white/10"
                                                    onError={(
                                                        event
                                                    ) => {
                                                        event.currentTarget.onerror =
                                                            null;

                                                        event.currentTarget.src =
                                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                                cast.name ||
                                                                    "Cast"
                                                            )}&size=200&background=1e40af&color=fff`;
                                                    }}
                                                />

                                                <p className="font-medium text-xs mt-3 line-clamp-2">
                                                    {
                                                        cast.name
                                                    }
                                                </p>
                                            </div>
                                        );
                                    }
                                )}

                        </div>
                    </div>
                </>
            )}

            {/* =================================================
                DATE SELECT
            ================================================= */}
            {hasShows && (
                <div
                    id="dateSelect"
                    className="mt-10"
                >
                    <DateSelect
                        dateTime={dateTime}
                        id={id}
                    />
                </div>
            )}

            {/* =================================================
                NO SHOW MESSAGE
            ================================================= */}
            {!hasShows && (
                <div className="mt-16 p-6 rounded-xl bg-gray-900/70 border border-white/10 text-center">
                    <p className="text-lg font-medium text-white">
                        No shows available
                    </p>

                    <p className="text-sm text-gray-400 mt-2">
                        This movie is currently
                        not scheduled in any
                        theater.
                    </p>
                </div>
            )}

            {/* =================================================
                YOU MAY ALSO LIKE
            ================================================= */}
            {recommendations.length >
                0 && (
                <div className="mt-20">

                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-lg font-medium">
                                You May Also Like
                            </p>

                            <p className="text-xs text-gray-500 mt-1">
                                Recommended based
                                on movie genres
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

                        {recommendations.map(
                            (
                                otherMovie
                            ) => {
                                const otherMovieId =
                                    getMovieId(
                                        otherMovie
                                    );

                                return (
                                    <div
                                        key={
                                            otherMovieId
                                        }
                                        className="cursor-pointer group"
                                        onClick={() => {
                                            if (
                                                !otherMovieId
                                            ) {
                                                return;
                                            }

                                            // IMPORTANT:
                                            // Navigate to the selected
                                            // recommendation's detail page.
                                            navigate(
                                                `/movies/${otherMovieId}`
                                            );

                                            // Make sure the page starts
                                            // from the top.
                                            window.scrollTo(
                                                {
                                                    top: 0,
                                                    behavior:
                                                        "smooth",
                                                }
                                            );
                                        }}
                                    >
                                        <div className="transition-transform duration-300 group-hover:-translate-y-1">
                                            <MovieCard
                                                movie={
                                                    otherMovie
                                                }
                                            />
                                        </div>
                                    </div>
                                );
                            }
                        )}

                    </div>
                </div>
            )}

            {/* =================================================
                TRAILER MODAL
            ================================================= */}
            {showTrailer &&
                embedUrl && (
                    <div
                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-5"
                        onClick={() =>
                            setShowTrailer(
                                false
                            )
                        }
                    >
                        <div
                            className="relative w-full max-w-5xl aspect-video"
                            onClick={(event) =>
                                event.stopPropagation()
                            }
                        >
                            <button
                                onClick={() =>
                                    setShowTrailer(
                                        false
                                    )
                                }
                                className="absolute -top-12 right-0 text-white text-3xl hover:text-primary transition"
                                aria-label="Close trailer"
                            >
                                ×
                            </button>

                            <iframe
                                src={
                                    embedUrl
                                }
                                title={
                                    movie.title ||
                                    "Movie Trailer"
                                }
                                className="w-full h-full rounded-lg bg-black"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                )}
        </div>
    );
};

export default MovieDetail;

