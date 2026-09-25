import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
    {
        // USER ID (Changed to ObjectId reference for Mongoose populate support)
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // SHOW ID
        show: {
            type: String,
            required: true,
        },

        // =====================================================
        // THEATER ID (NEW) — reference to Theater collection
        // Populated in getMyBookings to fetch fresh theater data
        // =====================================================
        theaterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Theater",
            default: null,
        },

        // MOVIE INFORMATION
        movieId: {
            type: String,
            required: true,
        },

        movieName: {
            type: String,
            required: true,
        },

        poster: {
            type: String,
            default: "",
        },

        // SHOW INFORMATION
        showDateTime: {
            type: Date,
            required: true,
        },

        showPrice: {
            type: Number,
            required: true,
        },

        runtime: {
            type: Number,
            default: 0,
        },

        // BOOKING INFORMATION
        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        bookedSeats: {
            type: [String],
            required: true,
        },

        // PAYMENT
        isPaid: {
            type: Boolean,
            default: false,
        },

        // Khalti fields (keep as is)
        paymentLink: {
            type: String,
            default: "",
        },

        pidx: {
            type: String,
            default: "",
        },

        transactionId: {
            type: String,
            default: "",
        },

        // NEW: Stripe fields (added)
        paymentMethod: {
            type: String,
            default: null,
        },

        paymentId: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);

export default Booking;