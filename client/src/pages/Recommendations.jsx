import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import MovieCard from "../components/MovieCard";
import { trackMovieInteraction } from "../utils/trackMovieInteraction";

const BACKEND_URL = "http://localhost:5000";

const RecommendedMovies = ({ currentMovieId }) => {
    const navigate = useNavigate();

    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getRecommendations = async () => {
            try {
                const token =
                    localStorage.getItem("userToken") ||
                    localStorage.getItem("token");

                if (!token) {
                    setMovies([]);
                    return;
                }

                const response = await axios.get(
                    `${BACKEND_URL}/api/recommendations?limit=10`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                console.log(
                    "Recommendation API:",
                    response.data
                );

                if (
                    response.data?.success &&
                    Array.isArray(
                        response.data.recommendations
                    )
                ) {
                    const recommendations =
                        response.data.recommendations.filter(
                            (movie) => {
                                const movieId =
                                    movie?._id || movie?.id;

                                return (
                                    String(movieId) !==
                                    String(currentMovieId)
                                );
                            }
                        );

                    setMovies(recommendations);
                } else {
                    setMovies([]);
                }
            } catch (error) {
                console.error(
                    "Recommendation error:",
                    error?.response?.data ||
                        error.message
                );

                setMovies([]);
            } finally {
                setLoading(false);
            }
        };

        getRecommendations();
    }, [currentMovieId]);

    const handleMovieClick = (movie) => {
        const movieId =
            movie?._id || movie?.id;

        if (!movieId) return;

        trackMovieInteraction(
            movieId,
            "recommendation_click"
        );

        navigate(`/movies/${movieId}`);

        window.scrollTo(0, 0);
    };

    /*
     * Don't display the section while loading.
     */
    if (loading) {
        return null;
    }

    /*
     * Don't display an empty recommendation section.
     */
    if (!movies.length) {
        return null;
    }

    return (
        <section className="mt-20">

            {/* SECTION HEADER */}

            <div className="mb-8">

                <h2 className="
                    text-2xl
                    md:text-3xl
                    font-semibold
                    text-white
                ">
                    Recommended For You
                </h2>

                <p className="
                    text-gray-400
                    text-sm
                    md:text-base
                    mt-2
                ">
                    Movies recommended based on users
                    with similar genre and cast preferences.
                </p>

            </div>

            {/* MOVIES */}

            <div className="
                grid
                grid-cols-2
                sm:grid-cols-3
                md:grid-cols-4
                lg:grid-cols-5
                gap-5
            ">

                {movies.map((movie, index) => {

                    const movieId =
                        movie?._id ||
                        movie?.id ||
                        `recommendation-${index}`;

                    return (
                        <div
                            key={movieId}
                            onClick={() =>
                                handleMovieClick(movie)
                            }
                            className="
                                cursor-pointer
                                group
                                transition-all
                                duration-300
                                hover:-translate-y-1
                            "
                        >

                            <MovieCard
                                movie={movie}
                            />

                            {movie.similarUsers !==
                                undefined && (
                                <p className="
                                    text-xs
                                    text-gray-500
                                    mt-2
                                    px-1
                                ">
                                    Recommended by{" "}
                                    <span className="
                                        text-gray-300
                                    ">
                                        {movie.similarUsers}
                                    </span>{" "}
                                    similar user
                                    {movie.similarUsers >
                                    1
                                        ? "s"
                                        : ""}
                                </p>
                            )}

                        </div>
                    );
                })}

            </div>

        </section>
    );
};

export default RecommendedMovies;