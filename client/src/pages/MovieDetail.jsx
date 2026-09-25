import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BlurCircle from "../components/BlurCircle";
import { PlayCircleIcon, StarIcon, Heart, X } from "lucide-react";
import DateSelect from "../components/DateSelect";
import timeFormat from "../lib/timeFormat";
import MovieRecommendations from "../components/MovieRecommendations";

// INTERACTIVE STAR RATING COMPONENT

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
                    onMouseEnter={() => !disabled && setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => !disabled && onChange(n)}
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

// MOVIE DETAIL

const MovieDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user, userToken } = useAuth();

    // MAIN STATE

    const [show, setShow] = useState(null);
    const [allMovies, setAllMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showTrailer, setShowTrailer] = useState(false);

    // FAVORITE STATE

    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);

    // RATING STATE

    const [userRating, setUserRating] = useState(0);
    const [avgRating, setAvgRating] = useState(0);
    const [totalRatings, setTotalRatings] = useState(0);
    const [ratingLoading, setRatingLoading] = useState(false);
    const [ratingMessage, setRatingMessage] = useState("");

    // FETCH RATINGS FOR THIS MOVIE

    const fetchRatings = async (movieId, movieObj) => {
        try {
            const headers = {};

            if (userToken) {
                headers.Authorization = `Bearer ${userToken}`;
            }

            const res = await fetch(
                `http://localhost:5000/movie/${movieId}/ratings`,
                {
                    headers,
                }
            );

            if (res.ok) {
                const data = await res.json();

                if (data.success) {
                    setAvgRating(
                        Number(data.averageRating) || 0
                    );

                    setTotalRatings(
                        Number(data.totalRatings) || 0
                    );

                    setUserRating(
                        Number(data.userRating) || 0
                    );

                    return;
                }
            }
        } catch (err) {
            console.warn(
                "Could not fetch ratings endpoint:",
                err.message
            );
        }

        // -------------------------------------------------
        // FALLBACK TO MOVIE OBJECT
        // -------------------------------------------------

        if (movieObj) {
            setAvgRating(
                Number(
                    movieObj.userRatingAvg ||
                    movieObj.vote_average ||
                    movieObj.rating ||
                    0
                )
            );

            setTotalRatings(
                Number(
                    movieObj.userRatingCount ||
                    movieObj.vote_count ||
                    0
                )
            );
        }
    };

    // CHECK USER FAVORITE STATUS

    const checkUserFavorite = async (movieId) => {
        try {
            if (!userToken || !user) {
                setIsFavorite(false);
                return [];
            }

            const response = await fetch(
                "http://localhost:5000/user/me",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                    },
                }
            );

            if (!response.ok) {
                return [];
            }

            const data = await response.json();

            const favouriteIds = Array.isArray(
                data.user?.favourites
            )
                ? data.user.favourites.map((fid) =>
                      String(
                          fid?._id ||
                          fid?.id ||
                          fid
                      )
                  )
                : [];

            setIsFavorite(
                favouriteIds.includes(
                    String(movieId)
                )
            );

            return favouriteIds;
        } catch (error) {
            console.error(
                "Error checking user favorites:",
                error
            );

            return [];
        }
    };

    // MAIN DATA LOAD EFFECT

    useEffect(() => {
        let isMounted = true;

        const loadMovieData = async () => {
            try {
                setLoading(true);

                // -------------------------------------------------
                // FETCH ALL SHOWS
                // -------------------------------------------------

                const response = await fetch(
                    "http://localhost:5000/show/all"
                );

                if (!response.ok) {
                    throw new Error(
                        `Server error: ${response.status}`
                    );
                }

                const data = await response.json();

                if (
                    !data.success ||
                    !Array.isArray(data.shows)
                ) {
                    throw new Error(
                        "Invalid show data received."
                    );
                }

                // -------------------------------------------------
                // GET SHOWS FOR CURRENT MOVIE
                // -------------------------------------------------

                const movieShows = data.shows.filter(
                    (showItem) => {
                        if (!showItem.movie) {
                            return false;
                        }

                        const movieId =
                            showItem.movie._id ||
                            showItem.movie.id;

                        return (
                            String(movieId) ===
                            String(id)
                        );
                    }
                );

                // -------------------------------------------------
                // MOVIE NOT AVAILABLE
                // -------------------------------------------------

                if (movieShows.length === 0) {
                    if (isMounted) {
                        setShow(null);
                        setLoading(false);
                    }

                    return;
                }

                // -------------------------------------------------
                // CURRENT MOVIE
                // -------------------------------------------------

                const movie =
                    movieShows[0].movie;

                // -------------------------------------------------
                // COMBINE DATE + TIME INFORMATION
                // -------------------------------------------------

                const combinedDateTimes = {};

                movieShows.forEach(
                    (showItem) => {
                        // -----------------------------------------
                        // dateTimes OBJECT
                        // -----------------------------------------

                        if (
                            showItem.dateTimes &&
                            typeof showItem.dateTimes ===
                                "object"
                        ) {
                            Object.entries(
                                showItem.dateTimes
                            ).forEach(
                                ([date, times]) => {
                                    if (
                                        !combinedDateTimes[
                                            date
                                        ]
                                    ) {
                                        combinedDateTimes[
                                            date
                                        ] = [];
                                    }

                                    if (
                                        Array.isArray(
                                            times
                                        )
                                    ) {
                                        times.forEach(
                                            (time) =>
                                                combinedDateTimes[
                                                    date
                                                ].push(
                                                    time
                                                )
                                        );
                                    }
                                }
                            );
                        }

                        // -----------------------------------------
                        // showDateTime
                        // -----------------------------------------

                        if (
                            showItem.showDateTime
                        ) {
                            const dateObject =
                                new Date(
                                    showItem.showDateTime
                                );

                            if (
                                !isNaN(
                                    dateObject.getTime()
                                )
                            ) {
                                const date =
                                    dateObject
                                        .toISOString()
                                        .split(
                                            "T"
                                        )[0];

                                const time =
                                    dateObject
                                        .toTimeString()
                                        .slice(
                                            0,
                                            5
                                        );

                                if (
                                    !combinedDateTimes[
                                        date
                                    ]
                                ) {
                                    combinedDateTimes[
                                        date
                                    ] = [];
                                }

                                if (
                                    !combinedDateTimes[
                                        date
                                    ].includes(
                                        time
                                    )
                                ) {
                                    combinedDateTimes[
                                        date
                                    ].push(
                                        time
                                    );
                                }
                            }
                        }
                    }
                );

                // -------------------------------------------------
                // REMOVE DUPLICATE TIMES
                // -------------------------------------------------

                Object.keys(
                    combinedDateTimes
                ).forEach((date) => {
                    combinedDateTimes[date] = [
                        ...new Set(
                            combinedDateTimes[
                                date
                            ]
                        ),
                    ].sort();
                });

                // -------------------------------------------------
                // BUILD ACTIVE SHOW MAP
                // -------------------------------------------------

                const activeShowMap =
                    new Map();

                data.shows.forEach(
                    (showItem) => {
                        if (!showItem.movie) {
                            return;
                        }

                        const movieKey = String(
                            showItem.movie._id ||
                                showItem.movie.id
                        );

                        if (
                            !activeShowMap.has(
                                movieKey
                            )
                        ) {
                            activeShowMap.set(
                                movieKey,
                                showItem
                            );
                        }
                    }
                );

                // -------------------------------------------------
                // MOVIES THAT HAVE SHOWS
                // -------------------------------------------------

                if (isMounted) {
                    setAllMovies(
                        Array.from(
                            activeShowMap.values()
                        )
                    );

                    setShow({
                        movie,
                        showData:
                            movieShows[0],
                        allShows:
                            movieShows,
                        dateTime:
                            combinedDateTimes,
                        trailer: {
                            videoUrl:
                                movie.trailer ||
                                movie.trailerUrl ||
                                movie.videoUrl ||
                                "",
                        },
                    });
                }

                // -------------------------------------------------
                // FAVORITE STATUS
                // -------------------------------------------------

                const movieId =
                    movie._id || movie.id;

                await checkUserFavorite(
                    movieId
                );

                // -------------------------------------------------
                // FETCH RATINGS
                // -------------------------------------------------

                await fetchRatings(
                    movieId,
                    movie
                );
            } catch (error) {
                console.error(
                    "Error loading movie details:",
                    error
                );

                if (isMounted) {
                    setShow(null);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadMovieData();

        return () => {
            isMounted = false;
        };
    }, [id, userToken]);

    // SUBMIT USER RATING

    const submitRating = async (value) => {
        if (!userToken || !user) {
            alert(
                "Please login to rate this movie."
            );

            navigate("/login");
            return;
        }

        if (!id || ratingLoading) {
            return;
        }

        setRatingLoading(true);
        setRatingMessage("");

        try {
            const res = await fetch(
                `http://localhost:5000/movie/${id}/rate`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization: `Bearer ${userToken}`,
                    },
                    body: JSON.stringify({
                        rating: value,
                    }),
                }
            );

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(
                    data.message ||
                        "Failed to submit rating."
                );
            }

            // -------------------------------------------------
            // UPDATE UI IMMEDIATELY
            // -------------------------------------------------

            setUserRating(value);

            if (
                data.averageRating !==
                undefined
            ) {
                setAvgRating(
                    Number(
                        data.averageRating
                    )
                );
            }

            if (
                data.totalRatings !==
                undefined
            ) {
                setTotalRatings(
                    Number(
                        data.totalRatings
                    )
                );
            }

            setRatingMessage(
                `Thanks! You rated this ${value} star${
                    value > 1 ? "s" : ""
                }.`
            );

            setTimeout(
                () => setRatingMessage(""),
                3000
            );
        } catch (err) {
            alert(
                err.message ||
                    "Unable to submit rating."
            );
        } finally {
            setRatingLoading(false);
        }
    };


    // TOGGLE FAVORITE

    const toggleFavorite = async () => {
        try {
            if (!show?.movie) {
                return;
            }

            if (!userToken || !user) {
                alert(
                    "Please login first."
                );

                navigate("/login");
                return;
            }

            const movieId =
                show.movie._id ||
                show.movie.id;

            if (favoriteLoading) {
                return;
            }

            setFavoriteLoading(true);

            const response = await fetch(
                `http://localhost:5000/user/favourite/${movieId}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                        "Content-Type":
                            "application/json",
                    },
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                alert(
                    data.message ||
                        "Unable to update favourite."
                );

                return;
            }

            setIsFavorite(
                data.isFavourite === true
            );

            window.dispatchEvent(
                new Event(
                    "favoritesUpdated"
                )
            );
        } catch (error) {
            console.error(
                "Favourite error:",
                error
            );
        } finally {
            setFavoriteLoading(false);
        }
    };

    // LOADING SCREEN

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-950">
                <h1 className="text-xl text-gray-300 animate-pulse">
                    Loading movie details...
                </h1>
            </div>
        );
    }

    // MOVIE NOT FOUND

    if (!show) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-950">
                <h1 className="text-xl text-white">
                    Movie not available
                </h1>

                <button
                    onClick={() =>
                        navigate("/movies")
                    }
                    className="mt-5 px-6 py-2 bg-primary rounded-md text-white cursor-pointer"
                >
                    Back to Movies
                </button>
            </div>
        );
    }

    // MOVIE DATA

    const movie = show.movie;

    const posterUrl = movie.poster_path
        ? movie.poster_path.startsWith(
              "http"
          )
            ? movie.poster_path
            : `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : "/fallback.jpg";

    // TRAILER URL

    const videoUrl =
        show.trailer?.videoUrl;

    const embedUrl = videoUrl
        ? videoUrl.includes("watch?v=")
            ? videoUrl.replace(
                  "watch?v=",
                  "embed/"
              )
            : videoUrl.includes(
                  "youtu.be/"
              )
            ? videoUrl.replace(
                  "youtu.be/",
                  "youtube.com/embed/"
              )
            : videoUrl
        : null;

    // MOVIE INFORMATION

    const runtime = movie.runtime
        ? timeFormat(movie.runtime)
        : "N/A";

    const currentGenres = Array.isArray(
        movie.genres
    )
        ? movie.genres
              .map((genre) =>
                  typeof genre ===
                  "string"
                      ? genre
                      : genre.name
              )
              .filter(Boolean)
        : [];

    const genresString =
        currentGenres.join(", ") ||
        "N/A";

    const releaseYear =
        movie.release_date
            ? movie.release_date.split(
                  "-"
              )[0]
            : movie.releaseDate
            ? String(
                  movie.releaseDate
              ).split("-")[0]
            : "N/A";

    const casts = Array.isArray(
        movie.casts
    )
        ? movie.casts
        : Array.isArray(movie.cast)
        ? movie.cast
        : [];

    // RENDER

    return (
        <div className="px-6 md:px-16 lg:px-40 pt-30 md:pt-50">
            {/* 
                TOP SECTION
             */}

            <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto">
                {/* 
                    POSTER
                 */}

                <div className="max-md:mx-auto w-60 md:w-70 shrink-0">
                    <div className="w-full h-104 bg-gray-950 rounded-xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center">
                        <img
                            src={posterUrl}
                            alt={
                                movie.title ||
                                "Movie"
                            }
                            className="max-w-full max-h-full w-auto h-auto object-contain object-center"
                            onError={(e) => {
                                e.currentTarget.onerror =
                                    null;
                                e.currentTarget.src =
                                    "/fallback.jpg";
                            }}
                        />
                    </div>
                </div>

                {/* 
                    MOVIE INFORMATION
                 */}

                <div className="relative flex flex-col gap-3">
                    <BlurCircle
                        top="-100px"
                        left="-100px"
                    />

                    <p className="text-primary">
                        {movie.language ||
                            movie.original_language ||
                            "Nepali"}
                    </p>

                    <h1 className="text-4xl font-semibold max-w-96 text-balance text-white">
                        {movie.title ||
                            "Untitled Movie"}
                    </h1>

                    {/* 
                        RATING
                     */}

                    <div className="flex flex-col gap-3 mt-1">
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

                        {/* 
                            STAR INPUT
                         */}

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

                    {/* 
                        OVERVIEW
                     */}

                    <p className="text-gray-400 mt-2 text-sm leading-tight max-w-xl">
                        {movie.overview ||
                            "No description available."}
                    </p>

                    <p className="text-gray-300">
                        {runtime} •{" "}
                        {genresString} •{" "}
                        {releaseYear}
                    </p>

                    {/* 
                        ACTION BUTTONS
                     */}

                    <div className="flex items-center flex-wrap gap-4 mt-4">
                        {/* TRAILER */}

                        <button
                            onClick={() => {
                                if (
                                    embedUrl
                                ) {
                                    setShowTrailer(
                                        true
                                    );
                                } else {
                                    alert(
                                        "Trailer URL is missing in the database for this movie."
                                    );
                                }
                            }}
                            className="flex items-center gap-2 px-7 py-3 text-sm bg-gray-800 hover:bg-gray-900 text-white transition rounded-md font-medium cursor-pointer active:scale-95"
                        >
                            <PlayCircleIcon className="w-5 h-5" />

                            Watch Trailer
                        </button>

                        {/* BUY TICKETS */}

                        <a
                            href="#dateSelect"
                            className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull text-white transition rounded-md font-medium cursor-pointer active:scale-95"
                        >
                            Buy Tickets
                        </a>

                        {/* FAVORITE */}

                        <button
                            type="button"
                            onClick={
                                toggleFavorite
                            }
                            disabled={
                                favoriteLoading
                            }
                            className={`p-2.5 rounded-full transition cursor-pointer active:scale-95 ${
                                isFavorite
                                    ? "bg-primary text-white"
                                    : "bg-gray-700 text-white"
                            }`}
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

            {/* 
                CAST
             */}

            {casts.length > 0 && (
                <>
                    <p className="text-lg font-medium mt-20 text-white">
                        Favorite Cast
                    </p>

                    <div className="overflow-x-auto no-scrollbar mt-8 pb-4">
                        <div className="flex items-center gap-4 w-max px-4">
                            {casts
                                .slice(
                                    0,
                                    12
                                )
                                .map(
                                    (
                                        cast,
                                        index
                                    ) => {
                                        const castImage =
                                            cast.profile_path
                                                ? cast.profile_path.startsWith(
                                                      "http"
                                                  )
                                                    ? cast.profile_path
                                                    : `https://image.tmdb.org/t/p/w200${cast.profile_path}`
                                                : "/fallback.jpg";

                                        return (
                                            <div
                                                key={
                                                    cast.id ||
                                                    index
                                                }
                                                className="flex flex-col items-center text-center"
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
                                                />

                                                <p className="font-medium text-xs mt-3 text-gray-200">
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

            {/* 
                DATE SELECT
             */}

            <div id="dateSelect">
                <DateSelect
                    dateTime={
                        show.dateTime
                    }
                    id={id}
                />
            </div>

            {/* 
                HYBRID RECOMMENDATIONS
            
                This keeps MovieDetails separate from the
                Home-page collaborative filtering algorithm.
             */}

            <MovieRecommendations
                movieId={
                    movie._id ||
                    movie.id
                }
                user={user}
                allMovies={allMovies}
            />

            {/* 
                TRAILER MODAL
             */}

            {showTrailer &&
                embedUrl && (
                    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="relative w-full max-w-4xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/15">
                            {/* CLOSE BUTTON */}

                            <button
                                onClick={() =>
                                    setShowTrailer(
                                        false
                                    )
                                }
                                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 text-white transition cursor-pointer"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            {/* VIDEO */}

                            <div className="relative w-full aspect-video">
                                <iframe
                                    src={`${embedUrl}?autoplay=1`}
                                    title="Movie Trailer"
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default MovieDetail;