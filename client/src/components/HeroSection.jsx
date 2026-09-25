
import React, {
    useEffect,
    useState,
} from "react";
import { assets } from "../assets/assets";
import {
    ArrowRight,
    ClockIcon,
    CalendarIcon,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
    const navigate = useNavigate();

    const [movies, setMovies] = useState([]);
    const [currentIndex, setCurrentIndex] =
        useState(0);
    const [loading, setLoading] =
        useState(true);
    const [imageLoaded, setImageLoaded] =
        useState(true);

    // SLIDE ANIMATION STATE

    const [slideDirection, setSlideDirection] =
        useState("next");

    // FETCH MOVIES FROM DATABASE ONLY

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                setLoading(true);

                const response = await fetch(
                    "http://localhost:5000/show/all"
                );

                if (!response.ok) {
                    throw new Error(
                        `Server error: ${response.status}`
                    );
                }

                const data =
                    await response.json();

                if (
                    data.success &&
                    Array.isArray(data.shows)
                ) {
                    const movieMap = new Map();

                    data.shows.forEach((show) => {
                        if (show.movie) {
                            const movie =
                                show.movie;

                            const id =
                                movie._id ||
                                movie.id;

                            if (
                                id &&
                                !movieMap.has(
                                    String(id)
                                )
                            ) {
                                movieMap.set(
                                    String(id),
                                    movie
                                );
                            }
                        }
                    });

                    const uniqueMovies =
                        Array.from(
                            movieMap.values()
                        );

                    setMovies(uniqueMovies);
                } else {
                    setMovies([]);
                }
            } catch (error) {
                console.error(
                    "Error fetching movies:",
                    error
                );

                setMovies([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMovies();
    }, []);

    // =====================================================
    // AUTO SLIDE
    // =====================================================

    useEffect(() => {
        if (movies.length === 0) {
            return;
        }

        const interval =
            setInterval(() => {
                setSlideDirection(
                    "next"
                );

                setCurrentIndex(
                    (prev) =>
                        (prev + 1) %
                        movies.length
                );
            }, 4000);

        return () =>
            clearInterval(interval);
    }, [movies]);

    // =====================================================
    // RESET IMAGE LOADED STATE
    // =====================================================

    useEffect(() => {
        setImageLoaded(true);
    }, [currentIndex]);

    // =====================================================
    // MANUAL PREVIOUS
    // =====================================================

    const goToPrev = () => {
        if (movies.length === 0) {
            return;
        }

        setSlideDirection("prev");

        setCurrentIndex(
            (prev) =>
                (prev - 1 + movies.length) %
                movies.length
        );
    };

    // =====================================================
    // MANUAL NEXT
    // =====================================================

    const goToNext = () => {
        if (movies.length === 0) {
            return;
        }

        setSlideDirection("next");

        setCurrentIndex(
            (prev) =>
                (prev + 1) %
                movies.length
        );
    };

    // =====================================================
    // LOADING STATE
    // =====================================================

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-black">
                <div className="animate-pulse text-gray-300">
                    Loading movies...
                </div>
            </div>
        );
    }

    // =====================================================
    // NO MOVIES
    // =====================================================

    if (movies.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 bg-black h-screen text-white px-6">
                <h1 className="text-3xl md:text-5xl font-semibold">
                    No movies available
                </h1>

                <p className="text-gray-400">
                    Add some shows to see them here.
                </p>

                <button
                    onClick={() =>
                        navigate("/movies")
                    }
                    className="flex items-center gap-1 px-6 py-2.5 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
                >
                    Explore Movies

                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        );
    }

    // =====================================================
    // CURRENT MOVIE
    // =====================================================

    const movie =
        movies[currentIndex];

    // =====================================================
    // GENRES
    // =====================================================

    const genreNames =
        Array.isArray(movie.genres)
            ? movie.genres
                  .map((g) =>
                      typeof g ===
                      "string"
                          ? g
                          : g.name
                  )
                  .filter(Boolean)
                  .join(" | ")
            : "";

    // =====================================================
    // RUNTIME
    // =====================================================

    const runtimeHours =
        movie.runtime
            ? Math.floor(
                  movie.runtime / 60
              )
            : 0;

    const runtimeMinutes =
        movie.runtime
            ? movie.runtime % 60
            : 0;

    const runtimeDisplay =
        movie.runtime
            ? `${runtimeHours}h ${runtimeMinutes}m`
            : "N/A";

    // =====================================================
    // RELEASE YEAR
    // =====================================================

    const releaseYear =
        movie.release_date
            ? movie.release_date.split(
                  "-"
              )[0]
            : "";

    // =====================================================
    // BACKDROP / POSTER FALLBACK
    // =====================================================

    let backdropUrl =
        "/backgroundImage.png";

    if (movie.backdrop_path) {
        backdropUrl =
            movie.backdrop_path.startsWith(
                "http"
            )
                ? movie.backdrop_path
                : `https://image.tmdb.org/t/p/original${movie.backdrop_path}`;
    } else if (movie.poster_path) {
        backdropUrl =
            movie.poster_path.startsWith(
                "http"
            )
                ? movie.poster_path
                : `https://image.tmdb.org/t/p/original${movie.poster_path}`;
    }

    // =====================================================
    // IMAGE ERROR
    // =====================================================

    const handleImageError = () => {
        setImageLoaded(false);
    };

    // =====================================================
    // BACKGROUND STYLE
    // =====================================================

    const backgroundStyle = {
        backgroundImage: imageLoaded
            ? `url("${backdropUrl}")`
            : "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",

        backgroundSize: "cover",
        backgroundPosition: "center",
    };

    // =====================================================
    // SLIDE ANIMATION CLASS
    // =====================================================

    const slideAnimation =
        slideDirection === "next"
            ? "animate-slide-next"
            : "animate-slide-prev";

    return (
        <div className="relative h-screen bg-black overflow-hidden">

            {/* =================================================
                CURRENT SLIDE
            ================================================= */}

            <div
                key={currentIndex}
                className={`absolute inset-0 flex items-center bg-cover bg-center ${slideAnimation}`}
                style={backgroundStyle}
            >

                {/* Hidden image to detect load error */}
                <img
                    src={backdropUrl}
                    alt=""
                    className="hidden"
                    onError={
                        handleImageError
                    }
                    onLoad={() =>
                        setImageLoaded(true)
                    }
                />

                {/* =================================================
                    DARK OVERLAY
                ================================================= */}

                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />

                {/* =================================================
                    CONTENT
                ================================================= */}

                <div className="relative z-10 flex flex-col items-start justify-center gap-4 px-6 md:px-16 lg:pl-20 lg:pr-12 w-full max-w-5xl">

                    <img
                        src={assets.QUICKSHOWLOGO}
                        alt=""
                        className="max-h-11 lg:h-11 mt-16"
                    />

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold leading-tight text-white">
                        {movie.title ||
                            "Untitled Movie"}
                    </h1>

                    {/* =================================================
                        MOVIE INFORMATION
                    ================================================= */}

                    <div className="flex flex-wrap items-center gap-3 text-gray-300 text-sm md:text-base">

                        <span>
                            {genreNames ||
                                "Action | Adventure"}
                        </span>

                        {releaseYear && (
                            <div className="flex items-center gap-1">
                                <CalendarIcon className="w-4 h-4" />
                                {releaseYear}
                            </div>
                        )}

                        <div className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            {runtimeDisplay}
                        </div>

                    </div>

                    {/* =================================================
                        OVERVIEW
                    ================================================= */}

                    <p className="max-w-lg text-gray-300 text-sm md:text-base leading-relaxed">
                        {movie.overview ||
                            "No description available."}
                    </p>

                    {/* =================================================
                        EXPLORE MOVIES
                    ================================================= */}

                    <button
                        onClick={() =>
                            navigate(
                                "/movies"
                            )
                        }
                        className="flex items-center gap-1 px-6 py-2.5 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
                    >
                        Explore Movies

                        <ArrowRight className="w-4 h-4" />
                    </button>

                </div>
            </div>

            {/* =================================================
                PREVIOUS BUTTON
            ================================================= */}

            <button
                onClick={goToPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
                aria-label="Previous"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>

            {/* =================================================
                NEXT BUTTON
            ================================================= */}

            <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
                aria-label="Next"
            >
                <ChevronRight className="w-6 h-6" />
            </button>

            {/* =================================================
                SLIDE INDICATORS
            ================================================= */}

            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-30">

                {movies.map(
                    (_, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                if (
                                    idx ===
                                    currentIndex
                                ) {
                                    return;
                                }

                                setSlideDirection(
                                    idx >
                                        currentIndex
                                        ? "next"
                                        : "prev"
                                );

                                setCurrentIndex(
                                    idx
                                );
                            }}
                            aria-label={`Go to slide ${
                                idx + 1
                            }`}
                            className={`block h-1 rounded-full transition-all duration-300 ${
                                idx ===
                                currentIndex
                                    ? "w-4 bg-primary"
                                    : "w-2 bg-gray-400"
                            }`}
                        />
                    )
                )}

            </div>
        </div>
    );
};

export default HeroSection;
