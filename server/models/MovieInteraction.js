import mongoose from "mongoose";

const movieInteractionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        movieId: {
            type: String,
            required: true,
            index: true,
        },

        type: {
            type: String,
            enum: ["view", "click"],
            required: true,
        },

        count: {
            type: Number,
            default: 1,
        },

        lastInteractionAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// One record per user + movie + interaction type
movieInteractionSchema.index(
    {
        user: 1,
        movieId: 1,
        type: 1,
    },
    {
        unique: true,
    }
);

const MovieInteraction =
    mongoose.models.MovieInteraction ||
    mongoose.model("MovieInteraction", movieInteractionSchema);

export default MovieInteraction;