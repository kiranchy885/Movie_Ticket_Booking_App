import React, { useEffect, useState } from "react";
import axios from "axios";
import MovieCard from "../components/MovieCard";
import BlurCircle from "../components/BlurCircle";

const API_URL = "http://localhost:5000";

const Movies = () => {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // ==========================================
    // FETCH MOVIES
    // ==========================================
    const fetchMovies = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await axios.get(
                `${API_URL}/api/show/all`
            );

            console.log("Movies API response:", response.data);

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message ||
                    "Failed to load movies"
                );
            }

            const shows = Array.isArray(response.data.shows)
                ? response.data.shows
                : [];

            /*
             * The backend normally returns:
             *
             * {
             *   success: true,
             *   shows: [
             *      {
             *          _id: "SHOW_ID",
             *          movie: {
             *              _id: "MOVIE_ID",
             *              title: "...",
             *              poster_path: "..."
             *          }
             *      }
             *   ]
             * }
             */

            const movieMap = new Map();

            shows.forEach((show) => {
                if (!show) return;

                const movie =
                    typeof show.movie === "object"
                        ? show.movie
                        : null;

                if (!movie) return;

                // IMPORTANT:
                // Always use the actual MongoDB movie ID.
                const movieId =
                    movie._id ??
                    movie.id;

                if (!movieId) return;

                const id = String(movieId);

                if (!movieMap.has(id)) {
                    movieMap.set(id, {
                        ...movie,
                        _id: movieId,
                    });
                }
            });

            const movieList = Array.from(
                movieMap.values()
            );

            console.log(
                "Movies extracted from database:",
                movieList
            );

            setMovies(movieList);
        } catch (error) {
            console.error(
                "Error fetching movies from MongoDB:",
                error
            );

            setMovies([]);

            setError(
                error.response?.data?.message ||
                error.message ||
                "Unable to load movies."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMovies();
    }, []);

    // ==========================================
    // LOADING
    // ==========================================
    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-gray-600 border-t-primary rounded-full animate-spin mx-auto" />

                    <p className="mt-4 text-gray-400">
                        Loading movies...
                    </p>
                </div>
            </div>
        );
    }

    // ==========================================
    // ERROR
    // ==========================================
    if (error) {
        return (
            <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-semibold text-red-400">
                        Failed to load movies
                    </h2>

                    <p className="mt-3 text-gray-400">
                        {error}
                    </p>

                    <button
                        onClick={fetchMovies}
                        className="mt-6 px-6 py-3 bg-primary hover:bg-primary/80 rounded-full transition"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // PAGE
    // ==========================================
    return (
        <div className="relative min-h-screen bg-[#09090b] text-white pt-32 pb-20 overflow-hidden">
            <BlurCircle top="-100px" left="-100px" />
            <BlurCircle bottom="-150px" right="-100px" />

            <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10">
                {/* HEADER */}
                <div className="mb-10">
                    <p className="text-primary font-medium mb-2">
                        Explore
                    </p>

                    <h1 className="text-3xl md:text-4xl font-semibold">
                        Movies
                    </h1>

                    <p className="text-gray-400 mt-3">
                        Browse movies currently available
                        for booking.
                    </p>
                </div>

                {/* NO MOVIES */}
                {movies.length === 0 ? (
                    <div className="min-h-75 flex items-center justify-center">
                        <div className="text-center">
                            <h2 className="text-xl font-medium">
                                No movies available
                            </h2>

                            <p className="text-gray-500 mt-2">
                                Add movies and shows from the
                                admin dashboard.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {movies.map((movie) => {
                            const movieId =
                                movie._id ??
                                movie.id;

                            return (
                                <MovieCard
                                    key={String(movieId)}
                                    movie={{
                                        ...movie,
                                        _id: movieId,
                                    }}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Movies;