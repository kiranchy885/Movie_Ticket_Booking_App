import { ArrowRight, Clock, Trophy } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BlurCircle from "./BlurCircle";
import MovieCard from "./MovieCard";
import { useAuth } from "../context/AuthContext";

// =====================================================
// HELPER: resolve theater info from a show
// =====================================================
const resolveTheater = (show) => {
    if (show.theaterId && typeof show.theaterId === "object") {
        return {
            name: show.theaterId.name || "",
            city: show.theaterId.city || "",
            address: show.theaterId.address || "",
        };
    }

    if (show.theaterName) {
        return {
            name: show.theaterName,
            city: show.theaterCity || "",
            address: show.theaterAddress || "",
        };
    }

    if (show.theater && typeof show.theater === "object") {
        return {
            name: show.theater.name || "",
            city: show.theater.city || "",
            address: show.theater.address || "",
        };
    }

    return null;
};

// =====================================================
// HELPER: get HIGHEST user rating for a movie
//
// Returns { highest, count } — both 0 if there are no
// real user ratings. NEVER falls back to TMDB.
// =====================================================
const getUserRatingInfo = (movie) => {
    // 1. Use the ratings array (source of truth)
    if (
        Array.isArray(movie?.ratings) &&
        movie.ratings.length > 0
    ) {
        const valid = movie.ratings
            .map((r) => Number(r?.rating))
            .filter(
                (n) =>
                    Number.isFinite(n) &&
                    n >= 1 &&
                    n <= 5
            );

        if (valid.length > 0) {
            return {
                highest: Math.max(...valid),
                count: valid.length,
            };
        }
    }

    // 2. No real user rating → return 0/0
    return {
        highest: 0,
        count: 0,
    };
};

// =====================================================
// LIMITS — both tabs show exactly 4
// =====================================================
const NOW_SHOWING_LIMIT = 4;
const UPCOMING_LIMIT = 4;

const FeaturedSection = () => {
    const navigate = useNavigate();

    // =================================================
    // AUTH
    // =================================================
    const { user } = useAuth();

    const [featuredMovies, setFeaturedMovies] = useState([]);
    const [upcomingMovies, setUpcomingMovies] = useState([]);
    const [activeTab, setActiveTab] = useState("nowShowing");

    // =================================================
    // LOAD SHOWS FROM DATABASE
    // =================================================
    useEffect(() => {
        let isMounted = true;

        const fetchFeaturedMovies = async () => {
            try {
                const response = await fetch(
                    "http://localhost:5000/show/all"
                );

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(
                        data.message ||
                            "Failed to fetch shows"
                    );
                }

                // =================================================
                // FETCH ALL MOVIES (for rating data)
                // =================================================
                let allMoviesFromDb = [];

                try {
                    const moviesRes = await fetch(
                        "http://localhost:5000/movie/all"
                    );

                    if (moviesRes.ok) {
                        const moviesJson =
                            await moviesRes.json();

                        allMoviesFromDb =
                            Array.isArray(
                                moviesJson.movies
                            )
                                ? moviesJson.movies
                                : [];
                    }
                } catch (err) {
                    console.warn(
                        "Could not fetch /movie/all:",
                        err.message
                    );
                }

                // =================================================
                // BUILD MOVIE MAP
                // =================================================
                const movieDocMap = new Map();

                allMoviesFromDb.forEach((m) => {
                    if (
                        m &&
                        (m._id || m.id)
                    ) {
                        movieDocMap.set(
                            String(
                                m._id || m.id
                            ),
                            m
                        );
                    }
                });

                const currentTime = new Date();

                const startOfToday = new Date();
                startOfToday.setHours(
                    0,
                    0,
                    0,
                    0
                );

                const shows = Array.isArray(
                    data.shows
                )
                    ? data.shows
                    : [];

                // =================================================
                // NOW SHOWING
                // =================================================
                const activeShows =
                    shows.filter((show) => {
                        const t = new Date(
                            show.showDateTime ||
                                show.date
                        );

                        if (
                            isNaN(
                                t.getTime()
                            )
                        ) {
                            return false;
                        }

                        return (
                            t >=
                            startOfToday
                        );
                    });

                const nowShowingMap =
                    new Map();

                activeShows.forEach((show) => {
                    const movie = show.movie;

                    if (!movie) return;

                    const movieId =
                        typeof movie ===
                        "object"
                            ? String(
                                  movie._id ||
                                      movie.id
                              )
                            : String(
                                  movie
                              );

                    if (!movieId) return;

                    const fullMovie =
                        movieDocMap.get(
                            movieId
                        ) ||
                        (typeof movie ===
                        "object"
                            ? movie
                            : {
                                  _id:
                                      movieId,
                                  title:
                                      "Movie",
                              });

                    const theater =
                        resolveTheater(
                            show
                        );

                    const t = new Date(
                        show.showDateTime ||
                            show.date
                    );

                    if (
                        !nowShowingMap.has(
                            movieId
                        )
                    ) {
                        nowShowingMap.set(
                            movieId,
                            {
                                ...fullMovie,
                                _id: movieId,

                                _theaters:
                                    theater
                                        ? [
                                              theater,
                                          ]
                                        : [],

                                _theaterKeys:
                                    new Set(
                                        theater
                                            ? [
                                                  `${theater.name}|${theater.city}`,
                                              ]
                                            : []
                                    ),

                                _showDateTimes:
                                    [
                                        t.getTime(),
                                    ],

                                _earliest:
                                    t.getTime(),
                            }
                        );
                    } else {
                        const existing =
                            nowShowingMap.get(
                                movieId
                            );

                        if (
                            theater &&
                            theater.name
                        ) {
                            const key =
                                `${theater.name}|${
                                    theater.city ||
                                    ""
                                }`;

                            if (
                                !existing._theaterKeys.has(
                                    key
                                )
                            ) {
                                existing._theaterKeys.add(
                                    key
                                );

                                existing._theaters.push(
                                    theater
                                );
                            }
                        }

                        existing._showDateTimes.push(
                            t.getTime()
                        );

                        if (
                            t.getTime() <
                            existing._earliest
                        ) {
                            existing._earliest =
                                t.getTime();
                        }
                    }
                });

                // =================================================
                // CREATE COMPLETE NOW SHOWING LIST
                // =================================================
                const nowShowingList =
                    Array.from(
                        nowShowingMap.values()
                    )
                        .map((m) => {
                            const {
                                highest,
                                count,
                            } =
                                getUserRatingInfo(
                                    m
                                );

                            return {
                                ...m,

                                _highestRating:
                                    highest,

                                _ratingCount:
                                    count,

                                _theaters:
                                    m._theaters.sort(
                                        (a, b) =>
                                            a.name.localeCompare(
                                                b.name
                                            )
                                    ),

                                _showDateTimes:
                                    m._showDateTimes.sort(
                                        (a, b) =>
                                            a -
                                            b
                                    ),
                            };
                        })
                        .sort((a, b) => {
                            // Highest rating first
                            if (
                                b._highestRating !==
                                a._highestRating
                            ) {
                                return (
                                    b._highestRating -
                                    a._highestRating
                                );
                            }

                            // More votes first
                            if (
                                b._ratingCount !==
                                a._ratingCount
                            ) {
                                return (
                                    b._ratingCount -
                                    a._ratingCount
                                );
                            }

                            // Earliest show time
                            return (
                                a._earliest -
                                b._earliest
                            );
                        });

                // =================================================
                // HOME PAGE COLLABORATIVE FILTERING
                // -------------------------------------------------
                // Logged-in users:
                //     GET /user/recommendations/:userId
                //
                // The backend returns up to 4 recommended
                // active movies. We match those movies back
                // to nowShowingMap so theater/show-time data
                // is preserved for MovieCard.
                //
                // Guest users:
                //     Keep the existing rating-based fallback.
                // =================================================

                let personalizedNowShowing =
                    [];

                const userId =
                    user?._id ||
                    user?.id ||
                    null;

                if (userId) {
                    try {
                        const recommendationResponse =
                            await fetch(
                                `http://localhost:5000/user/recommendations/${userId}`
                            );

                        if (
                            recommendationResponse.ok
                        ) {
                            const recommendationData =
                                await recommendationResponse.json();

                            if (
                                recommendationData.success &&
                                Array.isArray(
                                    recommendationData.recommendations
                                )
                            ) {
                                const recommendationIds =
                                    recommendationData.recommendations.map(
                                        (movie) =>
                                            String(
                                                movie?._id ||
                                                    movie?.id ||
                                                    ""
                                            )
                                    );

                                // Match recommendation results to
                                // movies that actually have active shows.
                                personalizedNowShowing =
                                    recommendationIds
                                        .map(
                                            (recommendedId) =>
                                                nowShowingMap.get(
                                                    recommendedId
                                                )
                                        )
                                        .filter(
                                            Boolean
                                        )
                                        .slice(
                                            0,
                                            NOW_SHOWING_LIMIT
                                        );
                            }
                        } else {
                            console.warn(
                                "Recommendation endpoint returned:",
                                recommendationResponse.status
                            );
                        }
                    } catch (recommendationError) {
                        console.warn(
                            "Could not fetch personalized recommendations:",
                            recommendationError.message
                        );
                    }
                }

                // =================================================
                // SET NOW SHOWING
                // =================================================
                //
                // If personalized recommendations exist,
                // display them.
                //
                // Otherwise use existing rating-based ordering.
                // This protects the Home page from becoming empty
                // when recommendation data is insufficient.
                // =================================================

                const finalNowShowing =
                    personalizedNowShowing.length >
                    0
                        ? personalizedNowShowing
                        : nowShowingList.slice(
                              0,
                              NOW_SHOWING_LIMIT
                          );

                if (isMounted) {
                    setFeaturedMovies(
                        finalNowShowing
                    );
                }

                // =================================================
                // UPCOMING
                // =================================================
                const upcomingShows =
                    shows.filter(
                        (show) => {
                            const t =
                                new Date(
                                    show.showDateTime ||
                                        show.date ||
                                        currentTime
                                );

                            return (
                                t >
                                currentTime
                            );
                        }
                    );

                const upcomingMap =
                    new Map();

                upcomingShows.forEach(
                    (show) => {
                        const movie =
                            show.movie;

                        if (!movie) return;

                        const movieId =
                            typeof movie ===
                            "object"
                                ? String(
                                      movie._id ||
                                          movie.id
                                  )
                                : String(
                                      movie
                                  );

                        if (!movieId)
                            return;

                        const fullMovie =
                            movieDocMap.get(
                                movieId
                            ) ||
                            (typeof movie ===
                            "object"
                                ? movie
                                : {
                                      _id:
                                          movieId,
                                      title:
                                          show.movieTitle ||
                                          "Movie",
                                  });

                        const theater =
                            resolveTheater(
                                show
                            );

                        const t = new Date(
                            show.showDateTime ||
                                show.date
                        );

                        const ts =
                            t.getTime();

                        if (
                            !upcomingMap.has(
                                movieId
                            )
                        ) {
                            upcomingMap.set(
                                movieId,
                                {
                                    ...fullMovie,
                                    _id: movieId,

                                    _theaters:
                                        theater
                                            ? [
                                                  theater,
                                              ]
                                            : [],

                                    _theaterKeys:
                                        new Set(
                                            theater
                                                ? [
                                                      `${theater.name}|${theater.city}`,
                                                  ]
                                                : []
                                        ),

                                    _showDateTimes:
                                        [
                                            ts,
                                        ],

                                    _earliest:
                                        ts,
                                }
                            );
                        } else {
                            const existing =
                                upcomingMap.get(
                                    movieId
                                );

                            if (
                                theater &&
                                theater.name
                            ) {
                                const key =
                                    `${theater.name}|${
                                        theater.city ||
                                        ""
                                    }`;

                                if (
                                    !existing._theaterKeys.has(
                                        key
                                    )
                                ) {
                                    existing._theaterKeys.add(
                                        key
                                    );

                                    existing._theaters.push(
                                        theater
                                    );
                                }
                            }

                            existing._showDateTimes.push(
                                ts
                            );

                            if (
                                ts <
                                existing._earliest
                            ) {
                                existing._earliest =
                                    ts;
                            }
                        }
                    }
                );

                const upcomingList =
                    Array.from(
                        upcomingMap.values()
                    )
                        .map((m) => {
                            const {
                                highest,
                                count,
                            } =
                                getUserRatingInfo(
                                    m
                                );

                            const daysLeft =
                                Math.ceil(
                                    (m._earliest -
                                        Date.now()) /
                                        (1000 *
                                            60 *
                                            60 *
                                            24)
                                );

                            return {
                                ...m,

                                _daysLeft:
                                    daysLeft >
                                    0
                                        ? daysLeft
                                        : 1,

                                _highestRating:
                                    highest,

                                _ratingCount:
                                    count,

                                _theaters:
                                    m._theaters.sort(
                                        (a, b) =>
                                            a.name.localeCompare(
                                                b.name
                                            )
                                    ),

                                _showDateTimes:
                                    m._showDateTimes.sort(
                                        (a, b) =>
                                            a -
                                            b
                                    ),
                            };
                        })
                        .sort((a, b) => {
                            // CHANGED: Sort by earliest show date/time in ascending order (soonest first)
                            if (
                                a._earliest !==
                                b._earliest
                            ) {
                                return (
                                    a._earliest -
                                    b._earliest
                                );
                            }

                            // Fallback: If show times are identical,
                            // sort by highest rating
                            if (
                                b._highestRating !==
                                a._highestRating
                            ) {
                                return (
                                    b._highestRating -
                                    a._highestRating
                                );
                            }

                            return (
                                b._ratingCount -
                                a._ratingCount
                            );
                        });

                if (isMounted) {
                    setUpcomingMovies(
                        upcomingList.slice(
                            0,
                            UPCOMING_LIMIT
                        )
                    );
                }
            } catch (error) {
                console.error(
                    "Error loading featured movies:",
                    error
                );

                if (isMounted) {
                    setFeaturedMovies([]);
                    setUpcomingMovies([]);
                }
            }
        };

        fetchFeaturedMovies();

        return () => {
            isMounted = false;
        };
    }, [user?._id, user?.id]);

    // =================================================
    // DISPLAYED MOVIES
    // =================================================
    const displayedMovies =
        activeTab === "nowShowing"
            ? featuredMovies
            : upcomingMovies;

    // =================================================
    // HIGHEST RATING AMONG DISPLAYED MOVIES
    // =================================================
    const ratedMovies =
        displayedMovies.filter(
            (m) =>
                m._highestRating > 0 &&
                m._ratingCount > 0
        );

    const topRating =
        ratedMovies.length > 0
            ? Math.max(
                  ...ratedMovies.map(
                      (m) =>
                          m._highestRating
                  )
              )
            : 0;

    // =================================================
    // UI
    // =================================================
    return (
        <div className="px-6 md:px-16 lg:px-24 xl:px-44 pt-0 pb-12 overflow-hidden">

            {/* ================================================= */}
            {/* HEADER WITH TABS */}
            {/* ================================================= */}
            <div className="relative flex items-center justify-between pt-16 pb-6">

                <BlurCircle
                    top="0"
                    right="-80px"
                />

                <div className="flex items-center gap-8">

                    {/* ================================================= */}
                    {/* NOW SHOWING */}
                    {/* ================================================= */}

                    <button
                        onClick={() =>
                            setActiveTab(
                                "nowShowing"
                            )
                        }
                        className={`flex items-center gap-2 text-xl font-bold cursor-pointer transition ${
                            activeTab ===
                            "nowShowing"
                                ? "text-white opacity-100"
                                : "text-gray-400 opacity-60 hover:opacity-100"
                        }`}
                    >
                        🎬 Now Showing
                    </button>

                    {/* ================================================= */}
                    {/* UPCOMING */}
                    {/* ================================================= */}

                    <button
                        onClick={() =>
                            setActiveTab(
                                "upcoming"
                            )
                        }
                        className={`flex items-center gap-2 text-xl font-bold cursor-pointer transition ${
                            activeTab ===
                            "upcoming"
                                ? "text-white opacity-100"
                                : "text-gray-400 opacity-60 hover:opacity-100"
                        }`}
                    >
                        <Clock className="w-5 h-5" />
                        Upcoming Movies
                    </button>
                </div>

                {/* ================================================= */}
                {/* VIEW MORE */}
                {/* ================================================= */}

                <button
                    onClick={() => {
                        navigate(
                            "/releases"
                        );

                        window.scrollTo(
                            0,
                            0
                        );
                    }}
                    className="group flex items-center gap-2 text-sm text-gray-300 hover:text-primary cursor-pointer transition"
                >
                    View More

                    <ArrowRight className="group-hover:translate-x-0.5 transition w-4.5 h-4.5" />
                </button>
            </div>

            {/* ================================================= */}
            {/* MOVIES */}
            {/* ================================================= */}

            {displayedMovies.length >
            0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">

                    {displayedMovies.map(
                        (movie) => {
                            const hasRating =
                                movie._highestRating >
                                    0 &&
                                movie._ratingCount >
                                    0;

                            const isTopRated =
                                hasRating &&
                                movie._highestRating ===
                                    topRating;

                            return (
                                <div
                                    key={
                                        movie._id
                                    }
                                    className="relative"
                                >

                                    {/* ================================================= */}
                                    {/* TOP RATED BADGE */}
                                    {/* ================================================= */}

                                    {isTopRated && (
                                        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-yellow-500 text-black text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">

                                            <Trophy
                                                size={
                                                    12
                                                }
                                            />

                                            Top Rated
                                        </div>
                                    )}

                                    {/* ================================================= */}
                                    {/* MOVIE CARD */}
                                    {/* ================================================= */}

                                    <MovieCard
                                        movie={
                                            movie
                                        }
                                        theaters={
                                            movie._theaters
                                        }
                                        showDateTimes={
                                            movie._showDateTimes
                                        }
                                        badge={
                                            activeTab ===
                                                "upcoming" &&
                                            movie._daysLeft
                                                ? `${movie._daysLeft} days left`
                                                : null
                                        }
                                    />
                                </div>
                            );
                        }
                    )}
                </div>
            ) : (
                <div className="flex justify-center items-center py-20">

                    <p className="text-gray-500">

                        {activeTab ===
                        "nowShowing"
                            ? "No shows available"
                            : "No upcoming movies available"}

                    </p>
                </div>
            )}
        </div>
    );
};

export default FeaturedSection;