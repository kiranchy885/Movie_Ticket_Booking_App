import mongoose from "mongoose";

const movieCenterSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },

        address: {
            type: String,
            required: true,
        },

        city: {
            type: String,
            required: true,
        },

        latitude: {
            type: Number,
            required: true,
        },
        phone: {
            type: String,
            default: "",
        },
        image: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

const MovieCenter = mongoose.model(
    "MovieCenter",
    movieCenterSchema
);

export default MovieCenter;