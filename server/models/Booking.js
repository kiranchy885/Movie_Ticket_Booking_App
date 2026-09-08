import mongoose from "mongoose";

// =====================================================
// BOOKING SCHEMA
// =====================================================

const bookingSchema = new mongoose.Schema(
    {
        // USER
        user: {
            type: String,
            required: true,
            ref: "User",
        },

        // SHOW
        show: {
            type: String,
            required: true,
            ref: "Show",
        },

        // TOTAL BOOKING AMOUNT
        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        // BOOKED SEATS
        bookedSeats: {
            type: [String],
            required: true,
        },
        // PAYMENT
            isPaid: {
            type: Boolean,
            default: false,
        },

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

const Booking = mongoose.model(
    "Booking",
    bookingSchema
);

export default Booking;