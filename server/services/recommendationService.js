import User from "../models/User.js";
import Movie from "../models/Movie.js";
import Booking from "../models/Booking.js";

/*
=========================================================
USER-BASED COLLABORATIVE FILTERING
=========================================================

Recommendation is shown ONLY when the current user has:

    1. Booking history
    2. Favourite movies
    3. Rating history

The algorithm:

    User activities
          ↓
    Movie preference profile
          ↓
    Find similar users
          ↓
    Collect movies from similar users
          ↓
    Match movie genres
          ↓
    Calculate recommendation score
          ↓
    Exclude already interacted movies
          ↓
    Return recommendations
*/

// -------------------------------------------------------
// Helper: normalize array values
// -------------------------------------------------------

const normalizeArray = (value) => {
    if (!Array.isArray(value)) return [];

    return value
        .map((item) => {
            if (typeof item === "string") {
                return item.trim().toLowerCase();
            }

            if (item && typeof item === "object") {
                return (
                    item.name ||
                    item.character ||
                    item.original_name ||
                    ""
                )
                    .toString()
                    .trim()
                    .toLowerCase();
            }

            return "";
        })
        .filter(Boolean);
};

// -------------------------------------------------------
// Get movie genres
// -------------------------------------------------------

const getMovieGenres = (movie) => {
    return normalizeArray(
        movie.genres ||
        movie.genre ||
        []
    );
};

// -------------------------------------------------------
// Get movie cast
// -------------------------------------------------------

const getMovieCast = (movie) => {
    return normalizeArray(
        movie.casts ||
        movie.cast ||
        []
    );
};

// -------------------------------------------------------
// Get user's favourite movie IDs
// -------------------------------------------------------

const getFavouriteMovieIds = (user) => {
    if (!Array.isArray(user.favourites)) {
        return [];
    }

    return user.favourites
        .map((movie) => {
            if (typeof movie === "string") {
                return movie;
            }

            return (
                movie._id ||
                movie.id ||
                movie.movieId
            )?.toString();
        })
        .filter(Boolean);
};

// -------------------------------------------------------
// Get user's booked movie IDs
// -------------------------------------------------------

const getBookedMovieIds = async (userId) => {
    try {
        const bookings = await Booking.find({
            user: userId
        }).lean();

        return bookings
            .map((booking) => {
                return (
                    booking.movie ||
                    booking.movieId
                )?.toString();
            })
            .filter(Boolean);

    } catch (error) {
        console.error(
            "Error getting booked movies:",
            error.message
        );

        return [];
    }
};

// -------------------------------------------------------
// Get user's rated movie IDs
// -------------------------------------------------------

const getRatedMovieIds = async (userId) => {
    try {
        const ratings = await Rating.find({
            user: userId
        }).lean();

        return ratings
            .map((rating) => {
                return (
                    rating.movie ||
                    rating.movieId
                )?.toString();
            })
            .filter(Boolean);

    } catch (error) {
        console.error(
            "Error getting rated movies:",
            error.message
        );

        return [];
    }
};

// -------------------------------------------------------
// Create movie preference profile
// -------------------------------------------------------

const createMovieProfile = (movies) => {
    const genreFrequency = {};
    const castFrequency = {};

    movies.forEach((movie) => {
        const genres = getMovieGenres(movie);
        const casts = getMovieCast(movie);

        genres.forEach((genre) => {
            genreFrequency[genre] =
                (genreFrequency[genre] || 0) + 1;
        });

        casts.forEach((cast) => {
            castFrequency[cast] =
                (castFrequency[cast] || 0) + 1;
        });
    });

    return {
        genres: genreFrequency,
        casts: castFrequency
    };
};

// -------------------------------------------------------
// Cosine similarity
// -------------------------------------------------------

const cosineSimilarity = (vectorA, vectorB) => {
    const keys = new Set([
        ...Object.keys(vectorA),
        ...Object.keys(vectorB)
    ]);

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    keys.forEach((key) => {
        const a = vectorA[key] || 0;
        const b = vectorB[key] || 0;

        dotProduct += a * b;

        magnitudeA += a * a;
        magnitudeB += b * b;
    });

    if (
        magnitudeA === 0 ||
        magnitudeB === 0
    ) {
        return 0;
    }

    return (
        dotProduct /
        (
            Math.sqrt(magnitudeA) *
            Math.sqrt(magnitudeB)
        )
    );
};

// -------------------------------------------------------
// Calculate similarity between two users
// -------------------------------------------------------

const calculateUserSimilarity = (
    userAProfile,
    userBProfile
) => {
    const genreSimilarity = cosineSimilarity(
        userAProfile.genres,
        userBProfile.genres
    );

    const castSimilarity = cosineSimilarity(
        userAProfile.casts,
        userBProfile.casts
    );

    /*
        Genre = 60%
        Cast  = 40%
    */

    const finalSimilarity =
        genreSimilarity * 0.6 +
        castSimilarity * 0.4;

    return {
        genreSimilarity,
        castSimilarity,
        finalSimilarity
    };
};

// -------------------------------------------------------
// Build complete user preference profile
// -------------------------------------------------------

const buildUserProfile = async (
    user,
    allMovies
) => {
    const favouriteIds =
        getFavouriteMovieIds(user);

    const bookedIds =
        await getBookedMovieIds(user._id);

    const ratedIds =
        await getRatedMovieIds(user._id);

    const interactedIds = [
        ...new Set([
            ...favouriteIds,
            ...bookedIds,
            ...ratedIds
        ])
    ];

    const interactedMovies =
        allMovies.filter((movie) =>
            interactedIds.includes(
                movie._id.toString()
            )
        );

    return {
        movieIds: interactedIds,

        bookingIds: bookedIds,

        favouriteIds,

        ratedIds,

        profile: createMovieProfile(
            interactedMovies
        )
    };
};

// -------------------------------------------------------
// Main recommendation function
// -------------------------------------------------------

export const getUserBasedRecommendations = async (
    userId,
    limit = 10
) => {
    try {

        // ---------------------------------------------
        // 1. Get current user
        // ---------------------------------------------

        const currentUser =
            await User.findById(userId).lean();

        if (!currentUser) {
            throw new Error("User not found");
        }

        // ---------------------------------------------
        // 2. Get all movies
        // ---------------------------------------------

        const allMovies =
            await Movie.find({}).lean();

        if (!allMovies.length) {
            return [];
        }

        // ---------------------------------------------
        // 3. Build current user's profile
        // ---------------------------------------------

        const currentUserData =
            await buildUserProfile(
                currentUser,
                allMovies
            );

        // ---------------------------------------------
        // 4. Check ALL THREE activities
        // ---------------------------------------------

        const hasBookings =
            currentUserData.bookingIds.length > 0;

        const hasFavourites =
            currentUserData.favouriteIds.length > 0;

        const hasRatings =
            currentUserData.ratedIds.length > 0;

        /*
        =================================================
        IMPORTANT CONDITION
        =================================================

        User MUST have:

            Booking + Favourite + Rating

        Otherwise, NO recommendations.
        */

        if (
            !hasBookings ||
            !hasFavourites ||
            !hasRatings
        ) {
            return [];
        }

        // ---------------------------------------------
        // 5. Get other users
        // ---------------------------------------------

        const otherUsers =
            await User.find({
                _id: {
                    $ne: userId
                }
            }).lean();

        const similarUsers = [];

        // ---------------------------------------------
        // 6. Calculate similarity
        // ---------------------------------------------

        for (const otherUser of otherUsers) {

            const otherUserData =
                await buildUserProfile(
                    otherUser,
                    allMovies
                );

            /*
            Only compare users who also have
            booking + favourite + rating history.
            */

            if (
                otherUserData.bookingIds.length === 0 ||
                otherUserData.favouriteIds.length === 0 ||
                otherUserData.ratedIds.length === 0
            ) {
                continue;
            }

            if (
                otherUserData.movieIds.length === 0
            ) {
                continue;
            }

            const similarity =
                calculateUserSimilarity(
                    currentUserData.profile,
                    otherUserData.profile
                );

            if (
                similarity.finalSimilarity > 0
            ) {
                similarUsers.push({
                    userId: otherUser._id,

                    movieIds:
                        otherUserData.movieIds,

                    similarity
                });
            }
        }

        // ---------------------------------------------
        // 7. Sort most similar users first
        // ---------------------------------------------

        similarUsers.sort(
            (a, b) =>
                b.similarity.finalSimilarity -
                a.similarity.finalSimilarity
        );

        // ---------------------------------------------
        // 8. Take top similar users
        // ---------------------------------------------

        const topSimilarUsers =
            similarUsers.slice(0, 10);

        // ---------------------------------------------
        // 9. Movies already interacted with
        // ---------------------------------------------

        const currentMovieIds =
            new Set(
                currentUserData.movieIds
            );

        // ---------------------------------------------
        // 10. Score recommended movies
        // ---------------------------------------------

        const recommendationScores = {};

        topSimilarUsers.forEach((similarUser) => {

            similarUser.movieIds.forEach(
                (movieId) => {

                    // Exclude movies already booked,
                    // favourited, or rated by current user
                    if (
                        currentMovieIds.has(movieId)
                    ) {
                        return;
                    }

                    if (
                        !recommendationScores[movieId]
                    ) {
                        recommendationScores[movieId] = {
                            score: 0,
                            users: 0
                        };
                    }

                    recommendationScores[movieId]
                        .score +=
                        similarUser
                            .similarity
                            .finalSimilarity;

                    recommendationScores[movieId]
                        .users += 1;
                }
            );
        });

        // ---------------------------------------------
        // 11. Convert scores into array
        // ---------------------------------------------

        const rankedMovies =
            Object.entries(
                recommendationScores
            )
                .map(
                    ([movieId, data]) => {

                        const movie =
                            allMovies.find(
                                (item) =>
                                    item._id.toString() ===
                                    movieId
                            );

                        if (!movie) {
                            return null;
                        }

                        return {
                            ...movie,

                            recommendationScore:
                                data.score,

                            similarUsers:
                                data.users
                        };
                    }
                )
                .filter(Boolean);

        // ---------------------------------------------
        // 12. Sort recommendations
        // ---------------------------------------------

        rankedMovies.sort(
            (a, b) => {

                if (
                    b.recommendationScore !==
                    a.recommendationScore
                ) {
                    return (
                        b.recommendationScore -
                        a.recommendationScore
                    );
                }

                return (
                    (b.vote_average || 0) -
                    (a.vote_average || 0)
                );
            }
        );

        // ---------------------------------------------
        // 13. Return recommendations
        // ---------------------------------------------

        return rankedMovies.slice(0, limit);

    } catch (error) {

        console.error(
            "Recommendation Error:",
            error
        );

        throw error;
    }
};