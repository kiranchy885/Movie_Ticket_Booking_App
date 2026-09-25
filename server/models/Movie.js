import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true,
        },

        title: {
            type: String,
            required: true,
        },

        trailer: {
            type: String,
            default: "",
        },

        overview: {
            type: String,
            default: "",
        },

        poster_path: {
            type: String,
            default: "",
        },

        backdrop_path: {
            type: String,
            default: "",
        },

        release_date: {
            type: String,
            default: "",
        },

        original_language: {
            type: String,
            default: "",
        },

        tagline: {
            type: String,
            default: "",
        },

        genres: {
            type: Array,
            default: [],
        },

        casts: {
            type: Array,
            default: [],
        },

        // =====================================================
        // DIRECTOR
        // -----------------------------------------------------
        // Used by the MovieDetails recommendation algorithm.
        // Default is kept empty so existing movie documents
        // continue to work without any changes.
        // =====================================================
        director: {
            type: String,
            default: "",
        },

        // =====================================================
        // POPULARITY DATA
        // -----------------------------------------------------
        // These fields are optional. They allow the
        // recommendation algorithm to use popularity when
        // the values are available.
        //
        // Existing movies will automatically use 0.
        // =====================================================
        views: {
            type: Number,
            default: 0,
        },

        bookingCount: {
            type: Number,
            default: 0,
        },

        vote_average: {
            type: Number,
            default: 0,
        },

        runtime: {
            type: Number,
            default: 0,
        },

        // =====================================================
        // RATING SYSTEM
        // One entry per user — user can update their rating anytime
        // =====================================================
        ratings: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },

                rating: {
                    type: Number,
                    min: 1,
                    max: 5,
                },

                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],

        // =====================================================
        // CACHED AVERAGE + COUNT
        // =====================================================
        userRatingAvg: {
            type: Number,
            default: 0,
        },

        userRatingCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const Movie =
    mongoose.models.Movie ||
    mongoose.model(
        "Movie",
        movieSchema
    );

export default Movie;