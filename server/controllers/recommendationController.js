
import Movie from "../models/Movie.js";
import User from "../models/User.js";
import Show from "../models/Show.js";
import Booking from "../models/Booking.js";

// =====================================================
// CONFIGURATION
// =====================================================

const MAX_RECOMMENDATIONS = 4;

// Main hybrid weights
const CONTENT_WEIGHT = 0.80;
const USER_PREFERENCE_WEIGHT = 0.20;

// Content score weights
// Language removed because all movies use the same language.
// Its 10% weight has been added to Genre.
const GENRE_WEIGHT = 0.35;
const CAST_WEIGHT = 0.20;
const OVERVIEW_WEIGHT = 0.15;
const RATING_WEIGHT = 0.10;
const YEAR_WEIGHT = 0.05;
const RUNTIME_WEIGHT = 0.05;
const POPULARITY_WEIGHT = 0.10;

// User preference weights
const USER_RATING_PREFERENCE_WEIGHT = 0.50;
const USER_FAVOURITE_PREFERENCE_WEIGHT = 0.25;
const USER_COLLABORATIVE_PREFERENCE_WEIGHT = 0.25;

// =====================================================
// BASIC HELPERS
// =====================================================

const clamp = (value, min = 0, max = 1) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return min;
    }

    return Math.max(min, Math.min(max, number));
};

const toStringId = (value) => {
    if (value === null || value === undefined) {
        return "";
    }

    if (
        typeof value === "object" &&
        value._id !== undefined
    ) {
        return String(value._id);
    }

    return String(value);
};

// =====================================================
// GET MOVIE ID
// =====================================================

const getMovieId = (movie) => {
    if (!movie) {
        return "";
    }

    return String(
        movie._id ||
        movie.id ||
        ""
    );
};

// =====================================================
// TEXT NORMALIZATION
// =====================================================

const normalizeText = (value) => {
    return String(value || "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
};

// =====================================================
// TOKENIZATION
// =====================================================

const tokenize = (text) => {
    const normalized = normalizeText(text);

    if (!normalized) {
        return [];
    }

    const stopWords = new Set([
        "the",
        "a",
        "an",
        "and",
        "or",
        "of",
        "to",
        "in",
        "on",
        "for",
        "with",
        "from",
        "by",
        "is",
        "are",
        "was",
        "were",
        "this",
        "that",
        "these",
        "those",
        "as",
        "at",
        "into",
        "their",
        "his",
        "her",
        "its",
        "they",
        "them",
        "he",
        "she",
        "it",
        "be",
        "has",
        "have",
        "had",
        "will",
        "can",
        "about",
        "after",
        "before",
        "over",
        "under",
        "through",
        "during",
        "while",
        "who",
        "which",
        "where",
        "when",
        "what",
        "why",
        "how",
    ]);

    return normalized
        .split(" ")
        .map((word) => word.trim())
        .filter(
            (word) =>
                word.length > 1 &&
                !stopWords.has(word)
        );
};

// =====================================================
// EXTRACT GENRES
// =====================================================

const getGenres = (movie) => {
    if (!Array.isArray(movie?.genres)) {
        return [];
    }

    return movie.genres
        .map((genre) => {
            if (
                typeof genre === "string"
            ) {
                return normalizeText(
                    genre
                );
            }

            return normalizeText(
                genre?.name ||
                    genre?.title ||
                    genre?.genre ||
                    ""
            );
        })
        .filter(Boolean);
};

// =====================================================
// EXTRACT CAST
// =====================================================

const getCasts = (movie) => {
    const source = Array.isArray(
        movie?.casts
    )
        ? movie.casts
        : Array.isArray(movie?.cast)
        ? movie.cast
        : [];

    return source
        .map((cast) => {
            if (
                typeof cast ===
                "string"
            ) {
                return normalizeText(
                    cast
                );
            }

            return normalizeText(
                cast?.name ||
                    cast?.original_name ||
                    ""
            );
        })
        .filter(Boolean);
};

// =====================================================
// OVERVIEW
// =====================================================

const getOverview = (movie) => {
    return normalizeText(
        movie?.overview || ""
    );
};

// =====================================================
// RELEASE YEAR
// =====================================================

const getReleaseYear = (movie) => {
    const value =
        movie?.release_date ||
        movie?.releaseDate ||
        "";

    if (!value) {
        return null;
    }

    const match =
        String(value).match(
            /\d{4}/
        );

    if (!match) {
        return null;
    }

    const year = Number(
        match[0]
    );

    return Number.isFinite(year)
        ? year
        : null;
};

// =====================================================
// RUNTIME
// =====================================================

const getRuntime = (movie) => {
    const runtime = Number(
        movie?.runtime
    );

    if (
        !Number.isFinite(runtime) ||
        runtime < 0
    ) {
        return 0;
    }

    return runtime;
};

// =====================================================
// REAL USER RATING
// IMPORTANT:
// Do not use vote_count.
// Do not use TMDB vote average as recommendation
// rating when real user ratings are unavailable.
// =====================================================

const getRealUserRatings = (
    movie
) => {
    if (
        !Array.isArray(
            movie?.ratings
        )
    ) {
        return [];
    }

    return movie.ratings
        .map((item) => ({
            userId: toStringId(
                item?.userId
            ),
            rating: Number(
                item?.rating
            ),
        }))
        .filter(
            (item) =>
                item.userId &&
                Number.isFinite(
                    item.rating
                ) &&
                item.rating >= 1 &&
                item.rating <= 5
        );
};

// =====================================================
// REAL USER RATING AVERAGE
// =====================================================

const getRealUserRatingAverage = (
    movie
) => {
    const ratings =
        getRealUserRatings(
            movie
        );

    if (ratings.length === 0) {
        return 0;
    }

    const total =
        ratings.reduce(
            (sum, item) =>
                sum + item.rating,
            0
        );

    return total / ratings.length;
};

// =====================================================
// JACCARD SIMILARITY
// =====================================================

const jaccardSimilarity = (
    firstArray = [],
    secondArray = []
) => {
    const first = new Set(
        firstArray.map((value) =>
            normalizeText(value)
        )
    );

    const second = new Set(
        secondArray.map((value) =>
            normalizeText(value)
        )
    );

    if (
        first.size === 0 &&
        second.size === 0
    ) {
        return 0;
    }

    const union = new Set([
        ...first,
        ...second,
    ]);

    let intersection = 0;

    first.forEach((value) => {
        if (second.has(value)) {
            intersection += 1;
        }
    });

    if (union.size === 0) {
        return 0;
    }

    return clamp(
        intersection / union.size
    );
};


const genreSimilarity = (
    currentMovie,
    candidateMovie
) => {
    return jaccardSimilarity(
        getGenres(currentMovie),
        getGenres(candidateMovie)
    );
};

// =====================================================
// CAST SIMILARITY
// =====================================================

const castSimilarity = (
    currentMovie,
    candidateMovie
) => {
    return jaccardSimilarity(
        getCasts(currentMovie),
        getCasts(candidateMovie)
    );
};

// =====================================================
// TF-IDF HELPERS
// =====================================================

const buildTermFrequency = (tokens) => {
    const frequency = {};

    tokens.forEach((token) => {
        frequency[token] =
            (frequency[token] || 0) +
            1;
    });

    const total = tokens.length;

    if (total === 0) {
        return frequency;
    }

    Object.keys(
        frequency
    ).forEach((token) => {
        frequency[token] =
            frequency[token] /
            total;
    });

    return frequency;
};

const buildDocumentFrequency = (
    documents
) => {
    const df = {};

    documents.forEach((tokens) => {
        const uniqueTokens =
            new Set(tokens);

        uniqueTokens.forEach(
            (token) => {
                df[token] =
                    (df[token] || 0) +
                    1;
            }
        );
    });

    return df;
};

// =====================================================
// TF-IDF COSINE SIMILARITY
// =====================================================

const tfidfCosineSimilarity = (
    firstText,
    secondText,
    corpusTexts = []
) => {
    const firstTokens =
        tokenize(firstText);

    const secondTokens =
        tokenize(secondText);

    if (
        firstTokens.length === 0 ||
        secondTokens.length === 0
    ) {
        return 0;
    }

    const corpusTokens = [
        ...corpusTexts.map(
            (text) => tokenize(text)
        ),
        firstTokens,
        secondTokens,
    ];

    const documentFrequency =
        buildDocumentFrequency(
            corpusTokens
        );

    const totalDocuments =
        corpusTokens.length;

    const firstTF =
        buildTermFrequency(
            firstTokens
        );

    const secondTF =
        buildTermFrequency(
            secondTokens
        );

    const vocabulary = new Set([
        ...Object.keys(firstTF),
        ...Object.keys(secondTF),
    ]);

    const firstVector = {};
    const secondVector = {};

    vocabulary.forEach((term) => {
        const df =
            documentFrequency[
                term
            ] || 0;

        const idf = Math.log(
            (totalDocuments + 1) /
                (df + 1)
        ) + 1;

        firstVector[term] =
            (firstTF[term] || 0) *
            idf;

        secondVector[term] =
            (secondTF[term] || 0) *
            idf;
    });

    let dotProduct = 0;
    let firstMagnitude = 0;
    let secondMagnitude = 0;

    vocabulary.forEach((term) => {
        dotProduct +=
            firstVector[term] *
            secondVector[term];

        firstMagnitude +=
            firstVector[term] *
            firstVector[term];

        secondMagnitude +=
            secondVector[term] *
            secondVector[term];
    });

    if (
        firstMagnitude === 0 ||
        secondMagnitude === 0
    ) {
        return 0;
    }

    return clamp(
        dotProduct /
            (Math.sqrt(
                firstMagnitude
            ) *
                Math.sqrt(
                    secondMagnitude
                ))
    );
};

// =====================================================
// RATING SIMILARITY
// =====================================================

const ratingSimilarity = (
    currentMovie,
    candidateMovie
) => {
    const currentRating =
        getRealUserRatingAverage(
            currentMovie
        );

    const candidateRating =
        getRealUserRatingAverage(
            candidateMovie
        );

    // No real rating available
    if (
        currentRating <= 0 ||
        candidateRating <= 0
    ) {
        return 0;
    }

    const difference =
        Math.abs(
            currentRating -
                candidateRating
        );

    return clamp(
        1 -
            difference / 4
    );
};

// =====================================================
// RELEASE YEAR SIMILARITY
// =====================================================

const releaseYearSimilarity = (
    currentMovie,
    candidateMovie
) => {
    const currentYear =
        getReleaseYear(
            currentMovie
        );

    const candidateYear =
        getReleaseYear(
            candidateMovie
        );

    if (
        !currentYear ||
        !candidateYear
    ) {
        return 0;
    }

    const difference =
        Math.abs(
            currentYear -
                candidateYear
        );

    // Exponential decay
    return clamp(
        Math.exp(
            -difference / 5
        )
    );
};

// =====================================================
// RUNTIME SIMILARITY
// =====================================================

const runtimeSimilarity = (
    currentMovie,
    candidateMovie
) => {
    const currentRuntime =
        getRuntime(
            currentMovie
        );

    const candidateRuntime =
        getRuntime(
            candidateMovie
        );

    if (
        currentRuntime <= 0 ||
        candidateRuntime <= 0
    ) {
        return 0;
    }

    const difference =
        Math.abs(
            currentRuntime -
                candidateRuntime
        );

    return clamp(
        1 -
            difference / 120
    );
};

// =====================================================
// USER RATING PREFERENCE
//
// Measures whether the candidate movie is similar
// to movies the user personally rated highly.
// =====================================================

const calculateUserRatingPreference = ({
    userRatings,
    candidateMovie,
    allMovies,
}) => {
    if (
        !Array.isArray(userRatings) ||
        userRatings.length === 0
    ) {
        return 0;
    }

    const candidateId =
        getMovieId(
            candidateMovie
        );

    const validRatings =
        userRatings.filter(
            (item) =>
                Number.isFinite(
                    Number(
                        item.rating
                    )
                )
        );

    if (
        validRatings.length === 0
    ) {
        return 0;
    }

    let weightedScore = 0;
    let totalWeight = 0;

    validRatings.forEach(
        (userRating) => {
            const ratedMovie =
                allMovies.find(
                    (movie) =>
                        getMovieId(
                            movie
                        ) ===
                        String(
                            userRating.movieId
                        )
                );

            if (!ratedMovie) {
                return;
            }

            if (
                getMovieId(
                    ratedMovie
                ) === candidateId
            ) {
                return;
            }

            const normalizedUserRating =
                clamp(
                    (Number(
                        userRating.rating
                    ) -
                        1) /
                        4
                );

            const similarity =
                calculateMovieContentSimilarity(
                    ratedMovie,
                    candidateMovie,
                    allMovies
                );

            weightedScore +=
                similarity *
                normalizedUserRating;

            totalWeight +=
                similarity;
        }
    );

    if (totalWeight === 0) {
        return 0;
    }

    return clamp(
        weightedScore /
            totalWeight
    );
};

// =====================================================
// FAVORITE PREFERENCE
//
// Checks how similar a candidate is to movies saved
// in the user's favorites.
// =====================================================

const calculateFavouritePreference = ({
    favouriteMovieIds,
    candidateMovie,
    allMovies,
}) => {
    if (
        !Array.isArray(
            favouriteMovieIds
        ) ||
        favouriteMovieIds.length === 0
    ) {
        return 0;
    }

    let highestSimilarity = 0;

    favouriteMovieIds.forEach(
        (favoriteId) => {
            const favoriteMovie =
                allMovies.find(
                    (movie) =>
                        getMovieId(
                            movie
                        ) ===
                        String(
                            favoriteId
                        )
                );

            if (!favoriteMovie) {
                return;
            }

            const similarity =
                calculateMovieContentSimilarity(
                    favoriteMovie,
                    candidateMovie,
                    allMovies
                );

            if (
                similarity >
                highestSimilarity
            ) {
                highestSimilarity =
                    similarity;
            }
        }
    );

    return clamp(
        highestSimilarity
    );
};

// =====================================================
// BUILD USER-MOVIE RATING MATRIX
// =====================================================

const buildRatingMatrix = (
    movies
) => {
    const matrix = new Map();

    movies.forEach((movie) => {
        const movieId =
            getMovieId(movie);

        if (!movieId) {
            return;
        }

        const ratings =
            getRealUserRatings(
                movie
            );

        ratings.forEach(
            ({
                userId,
                rating,
            }) => {
                if (
                    !matrix.has(
                        userId
                    )
                ) {
                    matrix.set(
                        userId,
                        new Map()
                    );
                }

                matrix
                    .get(userId)
                    .set(
                        movieId,
                        rating
                    );
            }
        );
    });

    return matrix;
};

// =====================================================
// COSINE SIMILARITY BETWEEN TWO MOVIE RATING VECTORS
// =====================================================

const movieRatingCosineSimilarity = (
    firstMovieId,
    secondMovieId,
    ratingMatrix
) => {
    const firstVector = [];
    const secondVector = [];

    ratingMatrix.forEach(
        (userMovies) => {
            const firstRating =
                userMovies.get(
                    firstMovieId
                );

            const secondRating =
                userMovies.get(
                    secondMovieId
                );

            if (
                Number.isFinite(
                    firstRating
                ) &&
                Number.isFinite(
                    secondRating
                )
            ) {
                firstVector.push(
                    firstRating
                );

                secondVector.push(
                    secondRating
                );
            }
        }
    );

    if (
        firstVector.length < 2
    ) {
        return 0;
    }

    let dotProduct = 0;
    let firstMagnitude = 0;
    let secondMagnitude = 0;

    for (
        let i = 0;
        i < firstVector.length;
        i += 1
    ) {
        dotProduct +=
            firstVector[i] *
            secondVector[i];

        firstMagnitude +=
            firstVector[i] *
            firstVector[i];

        secondMagnitude +=
            secondVector[i] *
            secondVector[i];
    }

    if (
        firstMagnitude === 0 ||
        secondMagnitude === 0
    ) {
        return 0;
    }

    return clamp(
        dotProduct /
            (Math.sqrt(
                firstMagnitude
            ) *
                Math.sqrt(
                    secondMagnitude
                ))
    );
};

// =====================================================
// COLLABORATIVE PREFERENCE
//
// Finds movies that have similar rating behavior to
// movies the user has rated.
// =====================================================

const calculateCollaborativePreference = ({
    userId,
    candidateMovie,
    allMovies,
    ratingMatrix,
}) => {
    if (
        !userId ||
        !ratingMatrix
    ) {
        return 0;
    }

    const userRatings =
        ratingMatrix.get(
            String(userId)
        );

    if (
        !userRatings ||
        userRatings.size === 0
    ) {
        return 0;
    }

    const candidateId =
        getMovieId(
            candidateMovie
        );

    if (!candidateId) {
        return 0;
    }

    let weightedSimilarity = 0;
    let totalWeight = 0;

    userRatings.forEach(
        (rating, ratedMovieId) => {
            if (
                ratedMovieId ===
                candidateId
            ) {
                return;
            }

            if (
                !allMovies.some(
                    (movie) =>
                        getMovieId(
                            movie
                        ) ===
                        ratedMovieId
                )
            ) {
                return;
            }

            const similarity =
                movieRatingCosineSimilarity(
                    ratedMovieId,
                    candidateId,
                    ratingMatrix
                );

            const ratingWeight =
                clamp(
                    (Number(
                        rating
                    ) -
                        1) /
                        4
                );

            weightedSimilarity +=
                similarity *
                ratingWeight;

            totalWeight +=
                similarity;
        }
    );

    if (
        totalWeight === 0
    ) {
        return 0;
    }

    return clamp(
        weightedSimilarity /
            totalWeight
    );
};

// =====================================================
// CONTENT SIMILARITY
//
// UPDATED FORMULA:
//
// 0.35 Genre
// 0.20 Cast
// 0.15 Overview
// 0.10 Rating
// 0.05 Year
// 0.05 Runtime
// 0.10 Popularity
//
// Language has been completely removed because all
// movies use the same language.
// =====================================================

const calculateMovieContentSimilarity = (
    currentMovie,
    candidateMovie,
    allMovies
) => {
    if (
        !currentMovie ||
        !candidateMovie
    ) {
        return 0;
    }

    const genreScore =
        genreSimilarity(
            currentMovie,
            candidateMovie
        );

    const castScore =
        castSimilarity(
            currentMovie,
            candidateMovie
        );

    const overviewCorpus =
        allMovies.map((movie) =>
            getOverview(movie)
        );

    const overviewScore =
        tfidfCosineSimilarity(
            getOverview(
                currentMovie
            ),
            getOverview(
                candidateMovie
            ),
            overviewCorpus
        );

    const ratingScore =
        ratingSimilarity(
            currentMovie,
            candidateMovie
        );

    const yearScore =
        releaseYearSimilarity(
            currentMovie,
            candidateMovie
        );

    const runtimeScore =
        runtimeSimilarity(
            currentMovie,
            candidateMovie
        );

    // Popularity is handled separately because it
    // requires real paid booking counts.
    const popularityScore = 0;

    return clamp(
        genreScore *
            GENRE_WEIGHT +
            castScore *
                CAST_WEIGHT +
            overviewScore *
                OVERVIEW_WEIGHT +
            ratingScore *
                RATING_WEIGHT +
            yearScore *
                YEAR_WEIGHT +
            runtimeScore *
                RUNTIME_WEIGHT +
            popularityScore *
                POPULARITY_WEIGHT
    );
};

// =====================================================
// BUILD MOVIE CONTENT FEATURES
// =====================================================

const buildContentFeatureData = (
    currentMovie,
    candidateMovie
) => {
    const genreScore =
        genreSimilarity(
            currentMovie,
            candidateMovie
        );

    const castScore =
        castSimilarity(
            currentMovie,
            candidateMovie
        );

    const currentOverview =
        getOverview(
            currentMovie
        );

    const candidateOverview =
        getOverview(
            candidateMovie
        );

    return {
        genreScore,
        castScore,
        currentOverview,
        candidateOverview,
        ratingScore:
            ratingSimilarity(
                currentMovie,
                candidateMovie
            ),
        yearScore:
            releaseYearSimilarity(
                currentMovie,
                candidateMovie
            ),
        runtimeScore:
            runtimeSimilarity(
                currentMovie,
                candidateMovie
            ),
    };
};

// BOOKING COUNT
//
// Only PAID bookings count toward popularity.

const buildPaidBookingCounts = (
    bookings
) => {
    const counts = new Map();

    bookings.forEach((booking) => {
        if (
            booking?.isPaid !== true
        ) {
            return;
        }

        const movieId = String(
            booking.movieId ||
                booking.movie ||
                ""
        );

        if (!movieId) {
            return;
        }

        counts.set(
            movieId,
            (counts.get(
                movieId
            ) || 0) + 1
        );
    });

    return counts;
};

// NORMALIZE BOOKING COUNT


const normalizeBookingCount = (
    count,
    maxCount
) => {
    if (
        !Number.isFinite(
            Number(count)
        ) ||
        maxCount <= 0
    ) {
        return 0;
    }

    return clamp(
        Number(count) /
            maxCount
    );
};

// NORMALIZED REAL USER RATING


const normalizedRealUserRating = (
    movie
) => {
    const rating =
        getRealUserRatingAverage(
            movie
        );

    if (rating <= 0) {
        return 0;
    }

    return clamp(
        rating / 5
    );
};

// POPULARITY


const calculatePopularityScore = ({
    candidateMovie,
    bookingCounts,
    maxBookingCount,
}) => {
    const ratingScore =
        normalizedRealUserRating(
            candidateMovie
        );

    const bookingScore =
        normalizeBookingCount(
            bookingCounts.get(
                getMovieId(
                    candidateMovie
                )
            ) || 0,
            maxBookingCount
        );

    return clamp(
        ratingScore * 0.70 +
            bookingScore * 0.30
    );
};

// =====================================================
// FINAL CONTENT SCORE
// =====================================================

const calculateFinalContentScore = ({
    currentMovie,
    candidateMovie,
    allMovies,
    bookingCounts,
    maxBookingCount,
}) => {
    const featureData =
        buildContentFeatureData(
            currentMovie,
            candidateMovie
        );

    const overviewCorpus =
        allMovies.map((movie) =>
            getOverview(movie)
        );

    const overviewScore =
        tfidfCosineSimilarity(
            featureData.currentOverview,
            featureData.candidateOverview,
            overviewCorpus
        );

    const popularityScore =
        calculatePopularityScore({
            candidateMovie,
            bookingCounts,
            maxBookingCount,
        });

    const contentScore = clamp(
        featureData.genreScore *
            GENRE_WEIGHT +
            featureData.castScore *
                CAST_WEIGHT +
            overviewScore *
                OVERVIEW_WEIGHT +
            featureData.ratingScore *
                RATING_WEIGHT +
            featureData.yearScore *
                YEAR_WEIGHT +
            featureData.runtimeScore *
                RUNTIME_WEIGHT +
            popularityScore *
                POPULARITY_WEIGHT
    );

    return {
        score: contentScore,
        parts: {
            genreScore:
                featureData.genreScore,
            castScore:
                featureData.castScore,
            overviewScore,
            ratingScore:
                featureData.ratingScore,
            yearScore:
                featureData.yearScore,
            runtimeScore:
                featureData.runtimeScore,
            popularityScore,
        },
    };
};

// FETCH USER DATA

const getUserRecommendationData =
    async (userId) => {
        if (!userId) {
            return {
                user: null,
                favouriteMovieIds: [],
                userRatings: [],
            };
        }

        try {
            const user =
                await User.findById(
                    userId
                )
                    .select(
                        "_id favourites bookings"
                    )
                    .lean();

            if (!user) {
                return {
                    user: null,
                    favouriteMovieIds: [],
                    userRatings: [],
                };
            }

            const favouriteMovieIds =
                Array.isArray(
                    user.favourites
                )
                    ? user.favourites.map(
                          (item) =>
                              toStringId(
                                  item
                              )
                      )
                    : [];

            return {
                user,
                favouriteMovieIds,
                userRatings: [],
            };
        } catch (error) {
            console.error(
                "User recommendation data error:",
                error.message
            );

            return {
                user: null,
                favouriteMovieIds: [],
                userRatings: [],
            };
        }
    };

// GET USER'S RATINGS DIRECTLY FROM MOVIES

const buildUserRatings = (
    userId,
    allMovies
) => {
    if (!userId) {
        return [];
    }

    const ratings = [];

    allMovies.forEach((movie) => {
        const movieId =
            getMovieId(movie);

        const movieRatings =
            getRealUserRatings(
                movie
            );

        const userRating =
            movieRatings.find(
                (item) =>
                    String(
                        item.userId
                    ) ===
                    String(userId)
            );

        if (userRating) {
            ratings.push({
                movieId,
                rating:
                    userRating.rating,
            });
        }
    });

    return ratings;
};


// MAIN MOVIE RECOMMENDATION CONTROLLER

export const getMovieRecommendations =
    async (req, res) => {
        try {
            const {
                movieId,
            } = req.params;

            const userId =
                req.query.userId
                    ? String(
                          req.query
                              .userId
                      )
                    : "";

            if (!movieId) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Movie ID is required.",
                        recommendations:
                            [],
                    });
            }

            // CURRENT TIME

            const now =
                new Date();

            console.log(
                "=========================================="
            );

            console.log(
                "🎬 MOVIE RECOMMENDATION REQUEST"
            );

            console.log(
                "Current movie:",
                movieId
            );

            console.log(
                "User:",
                userId ||
                    "guest"
            );

            console.log(
                "Current time:",
                now.toISOString()
            );

            // =================================================
            // GET CURRENT MOVIE
            // =================================================

            const currentMovie =
                await Movie.findById(
                    String(movieId)
                ).lean();

            if (!currentMovie) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            "Current movie not found.",
                        recommendations:
                            [],
                    });
            }

            // =================================================
            // ACTIVE / FUTURE SHOWS ONLY
            //
            // This is the mandatory eligibility filter.
            // =================================================

            const activeShows =
                await Show.find({
                    showDateTime: {
                        $gte: now,
                    },
                })
                    .select(
                        "movie showDateTime"
                    )
                    .lean();

            console.log(
                "Active/future shows:",
                activeShows.length
            );

            // =================================================
            // BUILD ACTIVE MOVIE ID SET
            // =================================================

            const activeMovieIds =
                new Set();

            activeShows.forEach(
                (show) => {
                    if (
                        show?.movie
                    ) {
                        const activeMovieId =
                            toStringId(
                                show.movie
                            );

                        if (
                            activeMovieId
                        ) {
                            activeMovieIds.add(
                                activeMovieId
                            );
                        }
                    }
                }
            );

            console.log(
                "Movies having active/future shows:",
                activeMovieIds.size
            );

            // =================================================
            // CURRENT MOVIE MUST ALSO EXIST IN ACTIVE SHOWS
            // =================================================

            const currentMovieIsActive =
                activeMovieIds.has(
                    String(
                        movieId
                    )
                );

            if (
                !currentMovieIsActive
            ) {
                console.log(
                    "⚠️ Current movie has no active/future show."
                );

                return res.json({
                    success: true,
                    currentMovie:
                        currentMovie,
                    recommendations:
                        [],
                    message:
                        "No recommendations because this movie has no active or future show.",
                });
            }

            // =================================================
            // GET ALL MOVIES
            // =================================================

            const allMovies =
                await Movie.find(
                    {}
                ).lean();

            // =================================================
            // ONLY ACTIVE MOVIES ARE CANDIDATES
            // =================================================

            const candidateMovies =
                allMovies.filter(
                    (movie) => {
                        const candidateId =
                            getMovieId(
                                movie
                            );

                        if (
                            !candidateId
                        ) {
                            return false;
                        }

                        // Exclude current movie
                        if (
                            candidateId ===
                            String(
                                movieId
                            )
                        ) {
                            return false;
                        }

                        // Must have an active/future show
                        if (
                            !activeMovieIds.has(
                                candidateId
                            )
                        ) {
                            return false;
                        }

                        return true;
                    }
                );

            console.log(
                "Eligible recommendation candidates:",
                candidateMovies.length
            );

            // =================================================
            // NO ELIGIBLE MOVIES
            // =================================================

            if (
                candidateMovies.length ===
                0
            ) {
                return res.json({
                    success: true,
                    currentMovie:
                        currentMovie,
                    recommendations:
                        [],
                    message:
                        "No other active movies are available for recommendation.",
                });
            }

            // =================================================
            // FETCH PAID BOOKINGS
            // =================================================

            const paidBookings =
                await Booking.find({
                    isPaid: true,
                })
                    .select(
                        "movieId movie isPaid"
                    )
                    .lean();

            const bookingCounts =
                buildPaidBookingCounts(
                    paidBookings
                );

            const maxBookingCount =
                Math.max(
                    0,
                    ...Array.from(
                        bookingCounts.values()
                    )
                );

            // =================================================
            // USER INFORMATION
            // =================================================

            const {
                favouriteMovieIds,
            } =
                await getUserRecommendationData(
                    userId
                );

            // =================================================
            // USER RATING HISTORY
            // =================================================

            const userRatings =
                buildUserRatings(
                    userId,
                    allMovies
                );

            // =================================================
            // RATING MATRIX
            // =================================================

            const ratingMatrix =
                buildRatingMatrix(
                    allMovies
                );

            // =================================================
            // SCORE EACH ACTIVE CANDIDATE
            // =================================================

            const scoredRecommendations =
                candidateMovies.map(
                    (candidateMovie) => {
                        // --------------------------------------
                        // CONTENT SCORE
                        // --------------------------------------

                        const contentResult =
                            calculateFinalContentScore(
                                {
                                    currentMovie,
                                    candidateMovie,
                                    allMovies,
                                    bookingCounts,
                                    maxBookingCount,
                                }
                            );

                        const contentScore =
                            contentResult.score;

                        // --------------------------------------
                        // USER RATING PREFERENCE
                        // --------------------------------------

                        const ratingPreference =
                            calculateUserRatingPreference(
                                {
                                    userRatings,
                                    candidateMovie,
                                    allMovies,
                                }
                            );

                        // --------------------------------------
                        // FAVORITE PREFERENCE
                        // --------------------------------------

                        const favouritePreference =
                            calculateFavouritePreference(
                                {
                                    favouriteMovieIds,
                                    candidateMovie,
                                    allMovies,
                                }
                            );

                        // --------------------------------------
                        // COLLABORATIVE PREFERENCE
                        // --------------------------------------

                        const collaborativePreference =
                            calculateCollaborativePreference(
                                {
                                    userId,
                                    candidateMovie,
                                    allMovies,
                                    ratingMatrix,
                                }
                            );

                        // --------------------------------------
                        // USER PREFERENCE SCORE
                        // --------------------------------------

                        const userPreferenceScore =
                            clamp(
                                ratingPreference *
                                    USER_RATING_PREFERENCE_WEIGHT +
                                    favouritePreference *
                                        USER_FAVOURITE_PREFERENCE_WEIGHT +
                                    collaborativePreference *
                                        USER_COLLABORATIVE_PREFERENCE_WEIGHT
                            );

                        // --------------------------------------
                        // FINAL HYBRID SCORE
                        // --------------------------------------

                        const finalScore =
                            clamp(
                                contentScore *
                                    CONTENT_WEIGHT +
                                    userPreferenceScore *
                                        USER_PREFERENCE_WEIGHT
                            );

                        return {
                            movie:
                                candidateMovie,

                            score:
                                finalScore,

                            details: {
                                contentScore,
                                userPreferenceScore,
                                ratingPreference,
                                favouritePreference,
                                collaborativePreference,
                                contentParts:
                                    contentResult.parts,
                                activeShow:
                                    true,
                            },
                        };
                    }
                );

            // =================================================
            // SORT
            // =================================================

            scoredRecommendations.sort(
                (a, b) =>
                    b.score -
                    a.score
            );

            // =================================================
            // TOP 4
            // =================================================

            const topRecommendations =
                scoredRecommendations
                    .slice(
                        0,
                        MAX_RECOMMENDATIONS
                    )
                    .map(
                        (item) => ({
                            ...item.movie,
                            recommendationScore:
                                Number(
                                    item.score.toFixed(
                                        4
                                    )
                                ),
                        })
                    );

            // =================================================
            // LOG RESULTS
            // =================================================

            console.log(
                "=========================================="
            );

            console.log(
                "✅ FINAL RECOMMENDATIONS"
            );

            topRecommendations.forEach(
                (movie, index) => {
                    console.log(
                        `${index + 1}. ${
                            movie.title
                        } → ${
                            movie.recommendationScore
                        }`
                    );
                }
            );

            console.log(
                "=========================================="
            );

            // =================================================
            // RESPONSE
            // =================================================

            return res.json({
                success: true,

                currentMovie:
                    currentMovie,

                recommendations:
                    topRecommendations,

                recommendationInfo: {
                    algorithm:
                        "Hybrid Content + User Preference",

                    contentWeight:
                        CONTENT_WEIGHT,

                    userPreferenceWeight:
                        USER_PREFERENCE_WEIGHT,

                    contentWeights: {
                        genre:
                            GENRE_WEIGHT,

                        cast:
                            CAST_WEIGHT,

                        overview:
                            OVERVIEW_WEIGHT,

                        rating:
                            RATING_WEIGHT,

                        year:
                            YEAR_WEIGHT,

                        runtime:
                            RUNTIME_WEIGHT,

                        popularity:
                            POPULARITY_WEIGHT,
                    },

                    userPreferenceWeights: {
                        rating:
                            USER_RATING_PREFERENCE_WEIGHT,

                        favourite:
                            USER_FAVOURITE_PREFERENCE_WEIGHT,

                        collaborative:
                            USER_COLLABORATIVE_PREFERENCE_WEIGHT,
                    },

                    activeMovieCount:
                        activeMovieIds.size,

                    candidateCount:
                        candidateMovies.length,

                    returnedCount:
                        topRecommendations.length,

                    onlyActiveShows:
                        true,

                    requiresShowDateTimeFromNow:
                        true,

                    currentTime:
                        now.toISOString(),
                },
            });
        } catch (error) {
            console.error(
                "❌ Movie Recommendation Error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,

                    message:
                        "Failed to generate movie recommendations.",

                    error:
                        error.message,

                    recommendations:
                        [],
                });
        }
    };