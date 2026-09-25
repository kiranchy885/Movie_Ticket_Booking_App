
import React, {
    useState,
    useCallback,
} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import HeroSection from "../components/HeroSection";
import FeaturedSection from "../components/FeaturedSection";
import TrailerSection from "../components/TrailerSection";
import MovieCard from "../components/MovieCard";
import { useAutoRefresh } from "../context/RefreshContext";
// CONFIG

const BACKEND_URL = "http://localhost:5000";
const MAX_NEARBY_DISTANCE_KM = 50;
const MAX_NEARBY_RESULTS = 6;
// DISTANCE CALCULATION
const getDistanceFromLatLonInKm = (
    lat1,
    lon1,
    lat2,
    lon2
) => {
    const R = 6371;
    const dLat =
        (Number(lat2) -
            Number(lat1)) *
        (Math.PI / 180);
    const dLon =
        (Number(lon2) -
            Number(lon1)) *
        (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) *
            Math.sin(dLat / 2) +
        Math.cos(
            Number(lat1) *
                (Math.PI / 180)
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
// HELPERS
const formatShowDateTime = (dt) => {
    try {
        const d = new Date(dt);
        if (isNaN(d.getTime())) {
            return {
                date: String(dt),
                time: "",
            };
        }
        return {
            date: d.toLocaleDateString(
                "en-US",
                {
                    day: "2-digit",
                    month: "short",
                }
            ),
            time: d.toLocaleTimeString(
                "en-US",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                }
            ),
        };
    } catch {
        return {
            date: String(dt),
            time: "",
        };
    }
};

// GET SHOW MOVIE ID

const getShowMovieId = (show) => {
    if (!show?.movie) {
        return "";
    }

    if (
        typeof show.movie ===
        "object"
    ) {
        return String(
            show.movie._id ||
                show.movie.id ||
                ""
        );
    }

    return String(show.movie);
};

// GET THEATER ID FROM SHOW

const getShowTheaterId = (show) => {
    if (!show) {
        return "";
    }

    if (
        show.theaterId &&
        typeof show.theaterId ===
            "object"
    ) {
        return String(
            show.theaterId._id ||
                show.theaterId.id ||
                ""
        );
    }

    if (
        show.theater &&
        typeof show.theater ===
            "object"
    ) {
        return String(
            show.theater._id ||
                show.theater.id ||
                ""
        );
    }

    return String(
        show.theaterId ||
            show.theater ||
            ""
    );
};

// HOME

const Home = () => {
    const navigate = useNavigate();

    // ---------- States ----------

    const [theaters, setTheaters] =
        useState([]);

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

    const [
        selectedTheater,
        setSelectedTheater,
    ] = useState(null);

    const [
        availableMovies,
        setAvailableMovies,
    ] = useState([]);

    const [
        loadingMovies,
        setLoadingMovies,
    ] = useState(false);

    const [allMovies, setAllMovies] =
        useState([]);

    
    // FETCH ALL MOVIES (for auto-refresh)

    const fetchAllMovies =
        useCallback(async () => {
            try {
                const response =
                    await axios.get(
                        `${BACKEND_URL}/show/all`
                    );

                const shows =
                    Array.isArray(
                        response.data?.shows
                    )
                        ? response.data.shows
                        : [];

                const movieMap =
                    new Map();

                shows.forEach(
                    (show) => {
                        const movie =
                            show.movie;

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
                                    movie
                                );
                            }
                        } else if (
                            movie &&
                            typeof movie ===
                                "string"
                        ) {
                            if (
                                !movieMap.has(
                                    movie
                                )
                            ) {
                                movieMap.set(
                                    movie,
                                    {
                                        _id: movie,
                                        title:
                                            show.movieTitle ||
                                            "Movie",
                                    }
                                );
                            }
                        }
                    }
                );

                setAllMovies(
                    Array.from(
                        movieMap.values()
                    )
                );
            } catch (error) {
                console.error(
                    "Error fetching all movies:",
                    error
                );
            }
        }, []);

    useAutoRefresh(
        fetchAllMovies,
        []
    );

    // FETCH MOVIES FOR THEATER

    const fetchMoviesForTheater =
        useCallback(
            async (theater) => {
                if (!theater?._id) {
                    return;
                }

                try {
                    setLoadingMovies(
                        true
                    );

                    setAvailableMovies(
                        []
                    );

                    console.log(
                        "Selected theater:",
                        theater
                    );

                    // 1. Get movie IDs from theater document

                    let movieIds =
                        Array.isArray(
                            theater.movies
                        )
                            ? theater.movies.map(
                                  String
                              )
                            : [];

                    try {
                        const res =
                            await axios.get(
                                `${BACKEND_URL}/theater/${theater._id}`
                            );

                        const fresh =
                            res.data
                                ?.theater ||
                            res.data?.data;

                        if (
                            fresh &&
                            Array.isArray(
                                fresh.movies
                            ) &&
                            fresh.movies
                                .length > 0
                        ) {
                            movieIds =
                                fresh.movies.map(
                                    String
                                );

                            console.log(
                                "Fresh theater.movies from DB:",
                                movieIds
                            );
                        }
                    } catch (
                        fetchErr
                    ) {
                        console.log(
                            "No /theater/:id endpoint — using cached theater.movies"
                        );
                    }

                    
                    // 2. Get all shows

                    const showsRes =
                        await axios.get(
                            `${BACKEND_URL}/show/all`
                        );

                    const allShows =
                        Array.isArray(
                            showsRes
                                .data
                                ?.shows
                        )
                            ? showsRes.data
                                  .shows
                            : [];

                    // 3. ACTIVE SHOWS ONLY

                    const now =
                        new Date();

                    const activeShowsAtTheater =
                        allShows.filter(
                            (show) => {
                                const theaterId =
                                    getShowTheaterId(
                                        show
                                    );

                                if (
                                    theaterId !==
                                    String(
                                        theater._id
                                    )
                                ) {
                                    return false;
                                }

                                const showDate =
                                    new Date(
                                        show.showDateTime
                                    );

                                return (
                                    !isNaN(
                                        showDate.getTime()
                                    ) &&
                                    showDate >=
                                        now
                                );
                            }
                        );

                    console.log(
                        "Active/future shows at this theater:",
                        activeShowsAtTheater
                    );

                    // 4. Group active shows by movie

                    const showsByMovie =
                        new Map();

                    activeShowsAtTheater.forEach(
                        (show) => {
                            const movieId =
                                getShowMovieId(
                                    show
                                );

                            if (!movieId) {
                                return;
                            }

                            if (
                                !showsByMovie.has(
                                    movieId
                                )
                            ) {
                                showsByMovie.set(
                                    movieId,
                                    {
                                        populatedMovie:
                                            show.movie &&
                                            typeof show.movie ===
                                                "object"
                                                ? show.movie
                                                : null,

                                        shows: [],
                                    }
                                );
                            }

                            showsByMovie
                                .get(
                                    movieId
                                )
                                .shows.push(
                                    show
                                );
                        }
                    );

                    // 5. Decide which movies to show

                    let targetIds;

                    if (
                        movieIds.length >
                        0
                    ) {
                        targetIds =
                            movieIds.filter(
                                (id) =>
                                    showsByMovie.has(
                                        id
                                    )
                            );
                    } else {
                        targetIds =
                            Array.from(
                                showsByMovie.keys()
                            );
                    }

                    console.log(
                        "Movies to display:",
                        targetIds
                    );

                    
                    // 6. Build final movie list

                    const finalMovies = [];

                    for (
                        const movieId of targetIds
                    ) {
                        const entry =
                            showsByMovie.get(
                                movieId
                            );

                        if (!entry) {
                            continue;
                        }

                        let movie =
                            entry.populatedMovie;

                        if (
                            !movie ||
                            !movie.title
                        ) {
                            try {
                                const movieRes =
                                    await axios.get(
                                        `${BACKEND_URL}/movie/${movieId}`
                                    );

                                movie =
                                    movieRes
                                        .data
                                        ?.movie ||
                                    movieRes
                                        .data
                                        ?.data ||
                                    movieRes.data;
                            } catch (
                                mErr
                            ) {
                                console.warn(
                                    `Could not fetch movie ${movieId}:`,
                                    mErr?.message
                                );

                                movie = {
                                    _id: movieId,
                                    title:
                                        "Unknown Movie",
                                };
                            }
                        }

                        if (!movie) {
                            movie = {
                                _id: movieId,
                                title:
                                    "Unknown Movie",
                            };
                        }

                        // PRICE
                    

                        const prices =
                            entry.shows
                                .map(
                                    (s) =>
                                        Number(
                                            s.showPrice ||
                                                0
                                        )
                                )
                                .filter(
                                    (n) =>
                                        n > 0
                                );

                        const price =
                            prices.length >
                            0
                                ? Math.min(
                                      ...prices
                                  )
                                : 0;

                        // SHOW TIMES

                        const showDateTimes =
                            entry.shows
                                .map(
                                    (s) => ({
                                        ...formatShowDateTime(
                                            s.showDateTime
                                        ),
                                        raw:
                                            s.showDateTime,
                                    })
                                )
                                .sort(
                                    (
                                        a,
                                        b
                                    ) =>
                                        new Date(
                                            a.raw
                                        ) -
                                        new Date(
                                            b.raw
                                        )
                                );

                        finalMovies.push(
                            {
                                ...movie,

                                _id:
                                    movieId,

                                price,

                                showDateTimes,

                                _shows:
                                    entry.shows,
                            }
                        );
                    }

                    
                    // 7. Sort by earliest upcoming show

                    finalMovies.sort(
                        (a, b) => {
                            const aT =
                                a._shows?.[0]
                                    ?.showDateTime;

                            const bT =
                                b._shows?.[0]
                                    ?.showDateTime;

                            return (
                                new Date(
                                    aT
                                ) -
                                new Date(
                                    bT
                                )
                            );
                        }
                    );

                    setAvailableMovies(
                        finalMovies
                    );
                } catch (error) {
                    console.error(
                        "Error fetching movies for theater:",
                        error
                    );

                    setAvailableMovies(
                        []
                    );
                } finally {
                    setLoadingMovies(
                        false
                    );
                }
            },
            []
        );

    // CLICK THEATER

    const handleTheaterClick =
        async (theater) => {
            setSelectedTheater(
                theater
            );

            await fetchMoviesForTheater(
                theater
            );
        };

    // CLOSE THEATER MOVIE MODAL

    const closeTheaterMovies =
        () => {
            setSelectedTheater(
                null
            );

            setAvailableMovies(
                []
            );
        };

    // LOCATION REQUEST

    const requestLocation = () => {
        if (
            !navigator.geolocation
        ) {
            setLocationError(true);
            setShowSettingsModal(
                true
            );
            return;
        }

        setLoading(true);
        setLocationError(false);
        setShowSettingsModal(
            false
        );

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat =
                    position.coords
                        .latitude;

                const lng =
                    position.coords
                        .longitude;

                console.log(
                    "User latitude:",
                    lat
                );

                console.log(
                    "User longitude:",
                    lng
                );

                try {
                    // 1. FETCH NEARBY THEATERS

                    const response =
                        await axios.get(
                            `${BACKEND_URL}/theater/nearby`,
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
                            response
                                .data
                                ?.theaters
                        )
                            ? response
                                  .data
                                  .theaters
                            : [];

                    // 2. FETCH ALL SHOWS


                    const showsResponse =
                        await axios.get(
                            `${BACKEND_URL}/show/all`
                        );

                    const allShows =
                        Array.isArray(
                            showsResponse
                                .data
                                ?.shows
                        )
                            ? showsResponse
                                  .data
                                  .shows
                            : [];

                    const now =
                        new Date();

                    // -------------------------------------------------
                    // 3. FIND THEATERS WITH ACTIVE/FUTURE MOVIES
                    // -------------------------------------------------

                    const theaterMovieMap =
                        new Map();

                    allShows.forEach(
                        (show) => {
                            const theaterId =
                                getShowTheaterId(
                                    show
                                );

                            const movieId =
                                getShowMovieId(
                                    show
                                );

                            if (
                                !theaterId ||
                                !movieId
                            ) {
                                return;
                            }

                            const showDate =
                                new Date(
                                    show.showDateTime
                                );

                            // Only active/future shows
                            if (
                                isNaN(
                                    showDate.getTime()
                                ) ||
                                showDate <
                                    now
                            ) {
                                return;
                            }

                            if (
                                !theaterMovieMap.has(
                                    theaterId
                                )
                            ) {
                                theaterMovieMap.set(
                                    theaterId,
                                    new Set()
                                );
                            }

                            theaterMovieMap
                                .get(
                                    theaterId
                                )
                                .add(
                                    movieId
                                );
                        }
                    );

                    console.log(
                        "Theater movie availability map:",
                        theaterMovieMap
                    );

                    // -------------------------------------------------
                    // 4. CALCULATE DISTANCE
                    // AND KEEP ONLY THEATERS WITH MOVIES
                    // -------------------------------------------------

                    const theatersWithDistance =
                        backendTheaters
                            .map(
                                (
                                    theater
                                ) => {
                                    let theaterLat =
                                        Number(
                                            theater.latitude
                                        );

                                    let theaterLng =
                                        Number(
                                            theater.longitude
                                        );

                                    if (
                                        (!Number.isFinite(
                                            theaterLat
                                        ) ||
                                            !Number.isFinite(
                                                theaterLng
                                            )) &&
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

                                    if (
                                        !Number.isFinite(
                                            theaterLat
                                        ) ||
                                        !Number.isFinite(
                                            theaterLng
                                        ) ||
                                        (theaterLat ===
                                            0 &&
                                            theaterLng ===
                                                0)
                                    ) {
                                        return null;
                                    }

                                    const distance =
                                        getDistanceFromLatLonInKm(
                                            lat,
                                            lng,
                                            theaterLat,
                                            theaterLng
                                        );

                                    const theaterId =
                                        String(
                                            theater._id
                                        );

                                    const movieSet =
                                        theaterMovieMap.get(
                                            theaterId
                                        );

                                    const movieCount =
                                        movieSet
                                            ? movieSet.size
                                            : 0;

                                    return {
                                        ...theater,

                                        latitude:
                                            theaterLat,

                                        longitude:
                                            theaterLng,

                                        distance,

                                        availableMovieCount:
                                            movieCount,
                                    };
                                }
                            )
                            .filter(Boolean)

                            // IMPORTANT:
                            // ONLY THEATERS WITH AT LEAST ONE ACTIVE/FUTURE
                            // MOVIE ARE DISPLAYED.

                            .filter(
                                (theater) =>
                                    Number.isFinite(
                                        theater.distance
                                    ) &&
                                    theater.distance <=
                                        MAX_NEARBY_DISTANCE_KM &&
                                    theater.availableMovieCount >
                                        0
                            )

                            .sort(
                                (a, b) =>
                                    a.distance -
                                    b.distance
                            )

                            .slice(
                                0,
                                MAX_NEARBY_RESULTS
                            );

                    console.log(
                        "Nearby theaters WITH available movies:",
                        theatersWithDistance
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

                setLocationError(
                    true
                );

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

    // OPEN WINDOWS LOCATION SETTINGS

    const openSystemSettings =
        () => {
            window.open(
                "ms-settings:privacy-location",
                "_blank"
            );

            window.open(
                "ms-settings:privacy-location",
                "_self"
            );
        };

    // OPEN MOVIE

    const handleMovieClick = (
        movie
    ) => {
        if (!movie?._id) {
            return;
        }

        navigate(
            `/movies/${movie._id}`
        );

        window.scrollTo(
            0,
            0
        );
    };


    // UI

    return (
        <div className="min-h-screen bg-black text-white">

            {/* 
                HERO
             */}

            <HeroSection />

            {/* 
                FIND NEARBY CINEMAS
             */}

            <div className="max-w-7xl mx-auto px-4 py-8">

                <div className="bg-linear-to-r from-gray-900 to-gray-800 border border-gray-800 rounded-2xl p-6 shadow-xl">

                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">
                                Find Movie Centers Near You
                            </h2>

                            <p className="text-gray-400 text-sm mt-1">
                                {hasSearched &&
                                theaters.length ===
                                    0
                                    ? `No theaters with available movies found within ${MAX_NEARBY_DISTANCE_KM} km.`
                                    : "Allow location to see nearby cinemas with available movies."}
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

                    {/* 
                        LOCATION ERROR
                     */}

                    {locationError &&
                        !showSettingsModal && (
                            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">

                                <p className="text-yellow-400 text-sm">
                                    ⚠️ Location access is
                                    required. Please allow
                                    location in your browser
                                    settings.
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

                    {/* 
                        NEARBY THEATERS
                     */}

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

                                                    <p className="text-sm text-blue-400 font-medium mt-1">
                                                        🎬{" "}
                                                        {
                                                            theater.availableMovieCount
                                                        }{" "}
                                                        {theater.availableMovieCount ===
                                                        1
                                                            ? "movie"
                                                            : "movies"}{" "}
                                                        available
                                                    </p>

                                                </div>

                                                <p className="text-xs text-gray-500 mt-3">
                                                    Click to see
                                                    available movies
                                                </p>

                                            </button>
                                        )
                                    )}

                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm">
                                    No theaters with
                                    available movies found
                                    within{" "}
                                    {
                                        MAX_NEARBY_DISTANCE_KM
                                    }{" "}
                                    km of your location.
                                </p>
                            )}

                        </div>
                    )}

                </div>
            </div>

            {/* 
                SELECTED THEATER / AVAILABLE MOVIES MODAL
             */}

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

                        {/* HEADER */}

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

                        <h3 className="text-xl font-semibold mb-4">
                            Movies Available Here
                        </h3>

                        {loadingMovies ? (
                            <div className="py-10 text-center text-gray-400">
                                Loading available movies...
                            </div>
                        ) : availableMovies.length >
                          0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                                {availableMovies.map(
                                    (
                                        movie
                                    ) => (
                                        <MovieCard
                                            key={String(
                                                movie._id
                                            )}
                                            movie={
                                                movie
                                            }
                                            theaters={[
                                                {
                                                    name:
                                                        selectedTheater.name,

                                                    city:
                                                        selectedTheater.city,

                                                    address:
                                                        selectedTheater.address,
                                                },
                                            ]}
                                            showDateTimes={
                                                movie.showDateTimes
                                            }
                                        />
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

            {/* 
                LOCATION SETTINGS MODAL
             */}

            {showSettingsModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">

                    <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">

                        <h3 className="text-xl font-bold text-white mb-2">
                            🌍 Location Access Required
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
                            click{" "}
                            <strong>
                                Retry
                            </strong>{" "}
                            to search again.
                        </p>

                    </div>
                </div>
            )}

            {/* 
                OTHER HOME SECTIONS
             */}

            <FeaturedSection />

            <TrailerSection />

        </div>
    );
};

export default Home;

