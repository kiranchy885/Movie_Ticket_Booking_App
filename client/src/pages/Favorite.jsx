import React, {
    useState,
    useCallback,
    useEffect,
} from "react";

import BlurCircle from "../components/BlurCircle";
import MovieCard from "../components/MovieCard";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Loading from "../components/Loading";

import { useAuth } from "../context/AuthContext";
import { useAutoRefresh } from "../context/RefreshContext";

import { Trophy } from "lucide-react";

// HELPER: resolve theater info from a show

const resolveTheater = (show) => {
    if (
        show.theaterId &&
        typeof show.theaterId === "object"
    ) {
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

    if (
        show.theater &&
        typeof show.theater === "object"
    ) {
        return {
            name: show.theater.name || "",
            city: show.theater.city || "",
            address: show.theater.address || "",
        };
    }

    return null;
};


// HELPER: GET HIGHEST REAL USER RATING
0
const getUserRatingInfo = (movie) => {
    const ratingsArray =
        movie?.ratings ||
        movie?.userRatings ||
        [];

    if (
        Array.isArray(ratingsArray) &&
        ratingsArray.length > 0
    ) {
        const valid = ratingsArray
            .map((r) =>
                Number(
                    r?.rating ?? r
                )
            )
            .filter(
                (n) =>
                    Number.isFinite(n) &&
                    n >= 1 &&
                    n <= 5
            );

        if (valid.length > 0) {
            return Math.max(...valid);
        }
    }

    return 0;
};

// HELPER: GET MOVIE ID

const getMovieId = (movie) => {
    if (!movie) {
        return "";
    }

    if (
        typeof movie === "object"
    ) {
        return String(
            movie._id ||
            movie.id ||
            ""
        );
    }

    return String(movie);
};

// HELPER: CHECK WHETHER A SHOW IS ACTIVE

// A show is active/valid when its showDateTime has
// NOT crossed the current date/time.

const isShowActive = (
    show,
    currentTime = new Date()
) => {
    if (!show) {
        return false;
    }

    const rawDateTime =
        show.showDateTime ||
        show.date ||
        null;

    if (!rawDateTime) {
        return false;
    }

    const showTime = new Date(
        rawDateTime
    );

    if (
        isNaN(showTime.getTime())
    ) {
        return false;
    }

    return showTime >= currentTime;
};

// FAVORITE PAGE

const Favorite = () => {
    const { user, userToken } =
        useAuth();

    const [
        favoriteMovies,
        setFavoriteMovies,
    ] = useState([]);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState("");

    // FETCH USER FAVORITES

    const fetchFavoriteMovies =
        useCallback(async () => {
            try {
                setLoading(true);
                setError("");

                // USER MUST BE LOGGED IN

                if (
                    !userToken ||
                    !user
                ) {
                    setFavoriteMovies([]);
                    setError(
                        "Please login."
                    );
                    setLoading(false);
                    return;
                }

                //
                // 1. GET USER FROM USERS TABLE
               
                // User.favourites is the SOURCE OF TRUTH.


                const userRes =
                    await fetch(
                        "http://localhost:5000/user/me",
                        {
                            method: "GET",
                            headers: {
                                Authorization: `Bearer ${userToken}`,
                            },
                        }
                    );

                if (!userRes.ok) {
                    throw new Error(
                        `/user/me failed: ${userRes.status}`
                    );
                }

                const userData =
                    await userRes.json();

                if (
                    !userData?.success &&
                    !userData?.user
                ) {
                    throw new Error(
                        "Invalid user data received."
                    );
                }

                const userFromDatabase =
                    userData.user;

                // -------------------------------------------------
                // USER FAVORITES FROM DATABASE
                // -------------------------------------------------

                const favouriteIds =
                    Array.isArray(
                        userFromDatabase?.favourites
                    )
                        ? userFromDatabase.favourites
                              .map(
                                  (
                                      favourite
                                  ) =>
                                      getMovieId(
                                          favourite
                                      )
                              )
                              .filter(
                                  Boolean
                              )
                        : [];

                console.log(
                    "❤️ Favourite IDs from Users table:",
                    favouriteIds
                );

                // -------------------------------------------------
                // NO FAVORITES
                // -------------------------------------------------

                if (
                    favouriteIds.length ===
                    0
                ) {
                    setFavoriteMovies(
                        []
                    );
                    setError(
                        "No favourites yet."
                    );

                    window.dispatchEvent(
                        new Event(
                            "favoritesUpdated"
                        )
                    );

                    setLoading(false);
                    return;
                }

                
                // 2. FETCH ALL SHOWS
           

                let allShows = [];

                try {
                    const showsRes =
                        await fetch(
                            "http://localhost:5000/show/all"
                        );

                    if (
                        showsRes.ok
                    ) {
                        const showsJson =
                            await showsRes.json();

                        allShows =
                            Array.isArray(
                                showsJson?.shows
                            )
                                ? showsJson.shows
                                : [];
                    }
                } catch (showError) {
                    console.warn(
                        "Could not fetch /show/all:",
                        showError.message
                    );
                }

                // 3. FILTER SHOWS BY CURRENT DATE/TIME
                
        
                // IMPORTANT:
                // Only shows that have NOT crossed their
                // showDateTime are considered.

             

                const now =
                    new Date();

                const activeShows =
                    allShows.filter(
                        (show) =>
                            isShowActive(
                                show,
                                now
                            )
                    );

                console.log(
                    "📅 Current time:",
                    now.toISOString()
                );

                console.log(
                    "🎬 Total shows:",
                    allShows.length
                );

                console.log(
                    "✅ Active/future shows:",
                    activeShows.length
                );

                
                // 4. GET ONLY FAVORITED MOVIES THAT HAVE
                //    ACTIVE/FUTURE SHOWS

                const activeFavoriteMovieIds =
                    new Set();

                activeShows.forEach(
                    (show) => {
                        const showMovieId =
                            getMovieId(
                                show?.movie
                            );

                        if (
                            showMovieId &&
                            favouriteIds.includes(
                                showMovieId
                            )
                        ) {
                            activeFavoriteMovieIds.add(
                                showMovieId
                            );
                        }
                    }
                );

                console.log(
                    "❤️ Favorite movies with active/future shows:",
                    Array.from(
                        activeFavoriteMovieIds
                    )
                );

            
                // 5. FETCH FAVORITED MOVIES
               
                // We still fetch from Movie collection so the
                // page has the complete movie information.
                //
                // But ONLY IDs from the Users table are used.
              

                const moviePromises =
                    favouriteIds.map(
                        async (
                            movieId
                        ) => {
                            try {
                                const res =
                                    await fetch(
                                        `http://localhost:5000/movie/${encodeURIComponent(
                                            movieId
                                        )}`
                                    );

                                if (
                                    !res.ok
                                ) {
                                    console.warn(
                                        `Movie ${movieId} fetch failed: ${res.status}`
                                    );

                                    return null;
                                }

                                const data =
                                    await res.json();

                                return (
                                    data?.movie ||
                                    data?.data ||
                                    data ||
                                    null
                                );
                            } catch (
                                movieError
                            ) {
                                console.warn(
                                    `Error fetching movie ${movieId}:`,
                                    movieError.message
                                );

                                return null;
                            }
                        }
                    );

                const results =
                    await Promise.all(
                        moviePromises
                    );

                // REMOVE NULL / INVALID MOVIES

                const matched =
                    results.filter(
                        Boolean
                    );

                // 6. FORMAT FAVORITES

                const formattedMovies =
                    matched
                        .map(
                            (movie) => {
                                const movieId =
                                    getMovieId(
                                        movie
                                    );

                                // HARD ACTIVE-SHOW CHECK
                                // This prevents a favorited movie from appearing
                                // if it has no active/future show.
                            
                                if (
                                    !activeFavoriteMovieIds.has(
                                        movieId
                                    )
                                ) {
                                    return null;
                                }

                                const highest =
                                    getUserRatingInfo(
                                        movie
                                    );

                                // FIND ONLY ACTIVE SHOWS FOR THIS MOVIE

                                const movieShows =
                                    activeShows.filter(
                                        (
                                            show
                                        ) => {
                                            const showMovieId =
                                                getMovieId(
                                                    show?.movie
                                                );

                                            return (
                                                showMovieId ===
                                                movieId
                                            );
                                        }
                                    );

                                // THEATERS

                                const theatersMap =
                                    new Map();

                                // SHOW DATE/TIMES

                                const showDateTimes =
                                    [];

                                movieShows.forEach(
                                    (
                                        show
                                    ) => {
                                        const theater =
                                            resolveTheater(
                                                show
                                            );

                                        if (
                                            theater &&
                                            theater.name
                                        ) {
                                            const key = `${theater.name}|${
                                                theater.city ||
                                                ""
                                            }`;

                                            if (
                                                !theatersMap.has(
                                                    key
                                                )
                                            ) {
                                                theatersMap.set(
                                                    key,
                                                    theater
                                                );
                                            }
                                        }

                                        const rawDateTime =
                                            show.showDateTime ||
                                            show.date;

                                        if (
                                            rawDateTime
                                        ) {
                                            const t =
                                                new Date(
                                                    rawDateTime
                                                );

                                            if (
                                                !isNaN(
                                                    t.getTime()
                                                ) &&
                                                t >=
                                                    now
                                            ) {
                                                showDateTimes.push(
                                                    t.getTime()
                                                );
                                            }
                                        }
                                    }
                                );

                                const theatersList =
                                    Array.from(
                                        theatersMap.values()
                                    ).sort(
                                        (
                                            a,
                                            b
                                        ) =>
                                            a.name.localeCompare(
                                                b.name
                                            )
                                    );

                            
                                // RETURN FORMATTED ACTIVE FAVORITE
                        

                                return {
                                    ...movie,

                                    _highestRating:
                                        highest >
                                        0
                                            ? highest
                                            : null,

                                    _theaters:
                                        theatersList,

                                    _showDateTimes:
                                        [
                                            ...new Set(
                                                showDateTimes
                                            ),
                                        ].sort(
                                            (
                                                a,
                                                b
                                            ) =>
                                                a -
                                                b
                                        ),
                                };
                            }
                        )
                        .filter(
                            Boolean
                        );

                // LOG FINAL RESULT

                console.log(
                    "✅ Final active favorite movies:",
                    formattedMovies
                );

                setFavoriteMovies(
                    formattedMovies
                );

                // IMPORTANT:
                // A favorite may still exist in User.favourites,
                // but if its show has ended, it is not displayed.
            
                // We are NOT removing it automatically from the
                // Users table.

                if (
                    formattedMovies.length ===
                    0
                ) {
                    setError(
                        "No favourite movies currently have an active or upcoming show."
                    );
                } else {
                    setError("");
                }

                window.dispatchEvent(
                    new Event(
                        "favoritesUpdated"
                    )
                );
            } catch (
                err
            ) {
                console.error(
                    "Favorite page error:",
                    err
                );

                setFavoriteMovies(
                    []
                );

                setError(
                    err.message ||
                        "Something went wrong."
                );
            } finally {
                setLoading(
                    false
                );
            }
        }, [
            userToken,
            user,
        ]);

    // AUTO REFRESH

    useAutoRefresh(
        fetchFavoriteMovies,
        [userToken, user]
    );

    // LISTEN FOR FAVORITE UPDATES

    useEffect(() => {
        const handleUpdate =
            () => {
                console.log(
                    "🔄 Favorite page received favoritesUpdated event"
                );

                fetchFavoriteMovies();
            };

        window.addEventListener(
            "favoritesUpdated",
            handleUpdate
        );

        return () => {
            window.removeEventListener(
                "favoritesUpdated",
                handleUpdate
            );
        };
    }, [
        fetchFavoriteMovies,
    ]);

    
    // LOADING

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col">
                <Navbar />

                <main className="flex-1 flex items-center justify-center">
                    <Loading />
                </main>

               

            </div>
        );
    }

    // NOT LOGGED IN

    if (
        !userToken ||
        !user
    ) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col">
                <Navbar />

                <main className="flex-1 flex flex-col items-center justify-center px-6">
                    <h1 className="text-3xl font-bold text-center">
                        Please login
                    </h1>

                    <button
                        onClick={() =>
                            (window.location.href =
                                "/login")
                        }
                        className="mt-6 px-6 py-2 bg-primary rounded-lg"
                    >
                        Login
                    </button>
                </main>

            
            </div>
        );
    }

    // GENERAL ERROR

    if (
        error &&
        error !==
            "No favourites yet." &&
        error !==
            "Favourite movies not found in database." &&
        error !==
            "No favourite movies currently have an active or upcoming show."
    ) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col">
                <Navbar />

                <main className="flex-1 flex flex-col items-center justify-center px-6">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md w-full">
                        <h1 className="text-2xl font-bold text-red-400 text-center">
                            Error
                        </h1>

                        <p className="text-gray-300 mt-3 text-center">
                            {error}
                        </p>

                        <button
                            onClick={
                                fetchFavoriteMovies
                            }
                            className="mt-6 w-full px-6 py-2 bg-primary rounded-lg"
                        >
                            Try Again
                        </button>
                    </div>
                </main>

              
            </div>
        );
    }

    // NO ACTIVE FAVORITES

    if (
        favoriteMovies.length ===
        0
    ) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col">
                <Navbar />

                <main className="flex-1 relative overflow-hidden px-4 py-10 md:px-16 lg:px-40">
                    <BlurCircle
                        top="150px"
                        left="0px"
                    />

                    <BlurCircle
                        bottom="50px"
                        right="50px"
                    />

                    <div className="flex flex-col items-center justify-center h-[50vh]">
                        <h1 className="text-3xl font-bold text-center">
                            No active favourite movies
                        </h1>

                        <p className="text-gray-400 mt-3 text-center max-w-lg">
                            Your favourite movies
                            are saved to your account,
                            but only movies with an
                            active or upcoming show are
                            displayed here.
                        </p>
                    </div>
                </main>

                
            </div>
        );
    }

    // TOP RATED BADGE CALCULATION


    const ratedMovies =
        favoriteMovies.filter(
            (movie) =>
                movie._highestRating !==
                    null &&
                movie._highestRating >
                    0
        );

    const topRating =
        ratedMovies.length > 0
            ? Math.max(
                  ...ratedMovies.map(
                      (movie) =>
                          movie._highestRating
                  )
              )
            : 0;

    // MAIN UI

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <Navbar />

            <main className="flex-1 relative overflow-hidden px-4 py-10 md:px-16 lg:px-40">
                <BlurCircle
                    top="150px"
                    left="0px"
                />

                <BlurCircle
                    bottom="50px"
                    right="50px"
                />

                {/* HEADER */}

                <div className="flex items-end justify-between mb-8 pt-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white">
                            Movie{" "}
                            <span className="text-primary">
                                Favorites
                            </span>
                        </h1>

                        <p className="text-gray-500 text-sm mt-1">
                            {
                                favoriteMovies.length
                            }{" "}
                            {favoriteMovies.length ===
                            1
                                ? "movie"
                                : "movies"}{" "}
                            currently active
                        </p>
                    </div>
                </div>

                {/* 
                    FAVORITE MOVIES GRID
               */}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {favoriteMovies.map(
                        (movie) => {
                            const ratingVal =
                                movie?._highestRating;

                            const hasRating =
                                ratingVal !==
                                    null &&
                                ratingVal !==
                                    undefined &&
                                ratingVal > 0;

                            const isTopRated =
                                hasRating &&
                                topRating >
                                    0 &&
                                ratingVal ===
                                    topRating;

                            return (
                                <div
                                    key={String(
                                        movie._id
                                    )}
                                    className="relative"
                                >
                                    {/* 
                                        TOP RATED BADGE
                                    */}

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

                                    {/* -----------------------------------------
                                        MOVIE CARD
                                    ----------------------------------------- */}

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
                                    />
                                </div>
                            );
                        }
                    )}
                </div>
            </main>

           
        </div>
    );
};

export default Favorite;