import React, {
    useEffect,
    useState,
    useCallback,
} from "react";

import MovieCard from "./MovieCard";

// =====================================================
// MOVIE RECOMMENDATIONS
// =====================================================

const MovieRecommendations = ({
    movieId,
    user,
    allMovies = [],
}) => {
    const [recommendations, setRecommendations] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    // -------------------------------------------------
    // GET USER ID
    // -------------------------------------------------

    const userId =
        user?._id ||
        user?.id ||
        "";

    // =====================================================
    // FETCH RECOMMENDATIONS
    // =====================================================

    const fetchRecommendations = useCallback(
        async () => {
            if (!movieId) {
                setRecommendations([]);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");

                // -------------------------------------------------
                // BUILD CORRECT API URL
                // -------------------------------------------------

                let url =
                    `http://localhost:5000/recommendations/movie/${encodeURIComponent(
                        movieId
                    )}`;

                // -------------------------------------------------
                // ADD USER ID ONLY WHEN LOGGED IN
                // -------------------------------------------------

                if (userId) {
                    url += `?userId=${encodeURIComponent(
                        userId
                    )}`;
                }

                console.log(
                    "🎬 Recommendation API:",
                    url
                );

                const response =
                    await fetch(url);

                const data =
                    await response.json();

                console.log(
                    "🎬 Recommendation response:",
                    data
                );

                if (!response.ok) {
                    throw new Error(
                        data?.message ||
                            `Recommendation server error: ${response.status}`
                    );
                }

                if (
                    !data.success ||
                    !Array.isArray(
                        data.recommendations
                    )
                ) {
                    setRecommendations([]);
                    return;
                }

                // -------------------------------------------------
                // REMOVE CURRENT MOVIE
                // -------------------------------------------------

                const filteredRecommendations =
                    data.recommendations.filter(
                        (movie) => {
                            const recommendationId =
                                String(
                                    movie?._id ||
                                        movie?.id ||
                                        ""
                                );

                            return (
                                recommendationId &&
                                recommendationId !==
                                    String(movieId)
                            );
                        }
                    );

                // -------------------------------------------------
                // LIMIT TO 4
                // -------------------------------------------------

                setRecommendations(
                    filteredRecommendations.slice(
                        0,
                        4
                    )
                );
            } catch (err) {
                console.error(
                    "❌ Recommendation fetch error:",
                    err
                );

                setError(
                    err.message ||
                        "Failed to load recommendations."
                );

                setRecommendations([]);
            } finally {
                setLoading(false);
            }
        },
        [movieId, userId]
    );

    // =====================================================
    // LOAD WHEN MOVIE / USER CHANGES
    // =====================================================

    useEffect(() => {
        fetchRecommendations();
    }, [fetchRecommendations]);

    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {
        return (
            <div className="mt-20">
                <p className="text-lg font-medium mb-8 text-white">
                    You May Also Like
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[1, 2, 3, 4].map(
                        (item) => (
                            <div
                                key={item}
                                className="rounded-xl overflow-hidden bg-gray-900 animate-pulse"
                            >
                                <div className="h-72 bg-gray-800" />

                                <div className="p-4 space-y-3">
                                    <div className="h-4 bg-gray-800 rounded" />
                                    <div className="h-3 bg-gray-800 rounded w-2/3" />
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        );
    }

    // =====================================================
    // ERROR
    // =====================================================

    if (
        error &&
        recommendations.length === 0
    ) {
        console.warn(
            "Movie recommendation section:",
            error
        );

        return null;
    }

    // =====================================================
    // NO RECOMMENDATIONS
    // =====================================================

    if (
        recommendations.length === 0
    ) {
        return null;
    }

    // =====================================================
    // FIND SHOW DATA FOR RECOMMENDED MOVIES
    // =====================================================

    const findMatchingShow = (
        recommendationMovie
    ) => {
        const recommendationId =
            String(
                recommendationMovie?._id ||
                    recommendationMovie?.id ||
                    ""
            );

        if (!recommendationId) {
            return null;
        }

        if (
            !Array.isArray(allMovies) ||
            allMovies.length === 0
        ) {
            return null;
        }

        return (
            allMovies.find((showItem) => {
                if (!showItem?.movie) {
                    return false;
                }

                const showMovieId =
                    String(
                        showItem.movie?._id ||
                            showItem.movie?.id ||
                            showItem.movie
                    );

                return (
                    showMovieId ===
                    recommendationId
                );
            }) || null
        );
    };

    // =====================================================
    // UI
    // =====================================================

    return (
        <div className="mt-20">
            <p className="text-lg font-medium mb-8 text-white">
                You May Also Like
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {recommendations.map(
                    (
                        recommendationMovie
                    ) => {
                        const recommendationId =
                            String(
                                recommendationMovie?._id ||
                                    recommendationMovie?.id
                            );

                        const matchedShow =
                            findMatchingShow(
                                recommendationMovie
                            );

                        return (
                            <MovieCard
                                key={
                                    recommendationId
                                }
                                movie={
                                    recommendationMovie
                                }
                                showDateTimes={
                                    matchedShow?.dateTimes ||
                                    {}
                                }
                                showDateTime={
                                    matchedShow?.showDateTime
                                }
                            />
                        );
                    }
                )}
            </div>
        </div>
    );
};

export default MovieRecommendations;