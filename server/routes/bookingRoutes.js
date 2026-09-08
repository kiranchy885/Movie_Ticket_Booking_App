import express from "express";

import {
    createBooking,
    getOccupiedSeats,
    getAllBookings,
    getBookingById,
    createStripeCheckoutSession,
    verifyStripePayment,
} from "../controllers/bookingController.js";
import { protect } from "../middleware/auth.js";

const bookingRouter =
    express.Router();


// =====================================================
// CREATE BOOKING
// POST /booking/create
// =====================================================

bookingRouter.post(
    "/create",
    createBooking
);


// =====================================================
// GET OCCUPIED SEATS
// GET /booking/seats/:showId
// =====================================================

bookingRouter.get(
    "/seats/:showId",
    getOccupiedSeats
);


// =====================================================
// GET ALL BOOKINGS
// GET /booking/all
// =====================================================

bookingRouter.get(
    "/all",
    getAllBookings
);


// =====================================================
// GET ONE BOOKING
// GET /booking/:bookingId
// =====================================================

bookingRouter.get(
    "/:bookingId",
    getBookingById
);

// =====================================================
// STRIPE PAYMENT
// =====================================================

bookingRouter.post(
    "/stripe/create-checkout-session/:bookingId",
    protect,
    createStripeCheckoutSession
);

bookingRouter.post(
    "/stripe/verify",
    protect,
    verifyStripePayment
);



export default bookingRouter;