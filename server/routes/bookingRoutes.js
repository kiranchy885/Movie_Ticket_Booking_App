import express from "express";

import {
    createBooking,
    getOccupiedSeats,
    getAllBookings,
    getBookingById,
    getMyBookings,
    payBooking,
    createStripeCheckoutSession,
    verifyStripePayment,
    createStripePaymentIntent,
    verifyStripePaymentIntent,   // NEW
    syncUserBookingsNow,         // NEW
    syncBookingPrice,            // NEW
    repairDatabaseNow,           // NEW
    deleteBookingById,           // NEW — for admin delete
} from "../controllers/bookingController.js";

import { protect } from "../middleware/auth.js";

const bookingRouter = express.Router();

// =====================================================
// BOOKING CRUD
// =====================================================

bookingRouter.post(
    "/create",
    protect,
    createBooking
);

bookingRouter.get(
    "/my",
    protect,
    getMyBookings
);

bookingRouter.get(
    "/occupied-seats/:showId",
    getOccupiedSeats
);

bookingRouter.get(
    "/all",
    getAllBookings
);

bookingRouter.put(
    "/pay/:bookingId",
    protect,
    payBooking
);

// =====================================================
// SYNC & REPAIR ROUTES (NEW)
// -----------------------------------------------------
// These MUST be declared before the generic "/:bookingId"
// route at the bottom, otherwise Express will match
// "sync-user" / "repair" as a booking ID.
// =====================================================

// Rewrites user.bookings to only contain real booking IDs
// and frees stale seats this user owns.
bookingRouter.post(
    "/sync-user",
    protect,
    syncUserBookingsNow
);

// Rewrites the stored amount / seatDetails of a single booking
// so the DB matches the pricing model shown in the UI.
bookingRouter.put(
    "/:id/sync-price",
    protect,
    syncBookingPrice
);

// One-shot database repair: cleans all users + all shows.
bookingRouter.post(
    "/repair",
    protect,
    repairDatabaseNow
);

// =====================================================
// STRIPE PAYMENT ROUTES
// =====================================================

// Redirect Checkout (legacy – kept for backward compatibility)
bookingRouter.post(
    "/stripe/create-checkout-session/:bookingId",
    protect,
    createStripeCheckoutSession
);

// Embedded Elements – create PaymentIntent
bookingRouter.post(
    "/stripe/create-payment-intent/:bookingId",
    protect,
    createStripePaymentIntent
);

// Verify PaymentIntent (for embedded Elements)
bookingRouter.post(
    "/stripe/verify-payment-intent",
    protect,
    verifyStripePaymentIntent
);

// Verify payment (works for both Checkout and Elements)
bookingRouter.post(
    "/stripe/verify",
    protect,
    verifyStripePayment
);

// =====================================================
// DELETE A BOOKING (admin)
// -----------------------------------------------------
// MUST be declared BEFORE the generic GET /:bookingId
// route below. Express matches routes top-to-bottom, and
// the HTTP method (DELETE) is different from GET, so
// ordering isn't strictly required here — but keeping
// mutating routes grouped makes the file easier to read.
// =====================================================

bookingRouter.delete(
    "/:bookingId",
    protect,
    deleteBookingById
);

// =====================================================
// GET SINGLE BOOKING (must be last to avoid route conflicts)
// =====================================================

bookingRouter.get(
    "/:bookingId",
    getBookingById
);

export default bookingRouter;