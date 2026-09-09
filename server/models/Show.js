import mongoose from "mongoose";

const showSchema = new mongoose.Schema(
    {
        movie: {
            type: String,
            ref: "Movie",
            required: true,
        },

        // ==========================================
        // THEATER
        // ==========================================
        theaterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Theater",
            required: true,
        },

        theaterName: {
            type: String,
            default: "",
        },

        theaterLat: {
            type: Number,
            default: 0,
        },

        theaterLng: {
            type: Number,
            default: 0,
        },

        theaterCity: {
            type: String,
            default: "",
        },

        theaterAddress: {
            type: String,
            default: "",
        },

        // ==========================================
        // SHOW DATE/TIME
        // ==========================================
        showDateTime: {
            type: Date,
            required: true,
        },

        // ==========================================
        // PRICE
        // ==========================================
        showPrice: {
            type: Number,
            required: true,
        },

        // ==========================================
        // OCCUPIED SEATS
        // ==========================================
        occupiedSeats: {
            type: Object,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

const Show = mongoose.model("Show", showSchema);

export default Show;