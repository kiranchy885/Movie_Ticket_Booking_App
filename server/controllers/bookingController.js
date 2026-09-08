
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import {
    sendBookingConfirmationEmail,
} from "../services/emailService.js";
import stripe from "../services/stripeService.js";


// =====================================================
// GET USER ID
// Supports Clerk and custom authentication
// =====================================================

const getUserId = (req) => {
    let userId = null;

    // ---------------------------------------------
    // Clerk authentication
    // ---------------------------------------------
    if (
        req.auth &&
        typeof req.auth === "function"
    ) {
        try {
            const authData = req.auth();
            userId = authData?.userId;
        } catch (error) {
            console.log(
                "Clerk auth check skipped:",
                error.message
            );
        }
    }

    // ---------------------------------------------
    // Custom authentication
    // ---------------------------------------------
    if (!userId) {
        userId =
            req.userId ||
            req.user?.id ||
            req.user?._id;
    }

    return userId
        ? String(userId)
        : null;
};


// =====================================================
// CHECK SEAT AVAILABILITY
// =====================================================

const checkSeatsAvailability = async (
    showId,
    selectedSeats
) => {
    try {
        const showData =
            await Show.findById(showId);

        if (!showData) {
            return false;
        }

        const occupiedSeats =
            showData.occupiedSeats || {};

        const isAnySeatTaken =
            selectedSeats.some(
                (seat) =>
                    occupiedSeats[String(seat)]
            );

        return !isAnySeatTaken;

    } catch (error) {
        console.error(
            "Seat availability error:",
            error.message
        );

        return false;
    }
};


// =====================================================
// CREATE BOOKING
// POST /booking/create
// =====================================================

export const createBooking = async (
    req,
    res
) => {
    try {
        console.log(
            "======================================"
        );

        console.log(
            "CREATE BOOKING REQUEST"
        );

        console.log(
            "Request body:",
            req.body
        );

        // =================================================
        // GET USER ID
        // =================================================

        const userId =
            getUserId(req);

        // =================================================
        // CHECK USER
        // =================================================

        if (!userId) {
            return res.status(401).json({
                success: false,
                message:
                    "User is not authenticated.",
            });
        }

        // =================================================
        // GET REQUEST DATA
        // =================================================

        const {
            showId,
            selectedSeats,
        } = req.body;

        // =================================================
        // VALIDATE SHOW ID
        // =================================================

        if (!showId) {
            return res.status(400).json({
                success: false,
                message:
                    "Show ID is required.",
            });
        }

        // =================================================
        // VALIDATE SEATS
        // =================================================

        if (
            !Array.isArray(selectedSeats) ||
            selectedSeats.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Please select at least one seat.",
            });
        }

        // =================================================
        // REMOVE DUPLICATE SEATS
        // =================================================

        const uniqueSeats = [
            ...new Set(
                selectedSeats.map(
                    (seat) =>
                        String(seat)
                )
            ),
        ];

        // =================================================
        // LIMIT SEATS
        // =================================================

        if (uniqueSeats.length > 5) {
            return res.status(400).json({
                success: false,
                message:
                    "You can book a maximum of 5 seats.",
            });
        }

        // =================================================
        // GET SHOW
        // =================================================

        const showData =
            await Show.findById(showId)
                .populate("movie");

        if (!showData) {
            return res.status(404).json({
                success: false,
                message:
                    "Show not found.",
            });
        }

        console.log(
            "Show from database:",
            showData
        );

        // =================================================
        // CHECK SEAT AVAILABILITY
        // =================================================

        const isAvailable =
            await checkSeatsAvailability(
                showId,
                uniqueSeats
            );

        if (!isAvailable) {
            return res.status(409).json({
                success: false,
                message:
                    "One or more selected seats are already booked.",
            });
        }

        // =================================================
        // GET SHOW PRICE
        // =================================================

        const showPrice =
            Number(showData.showPrice);

        if (
            !Number.isFinite(showPrice) ||
            showPrice <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid show price.",
            });
        }

        // =================================================
        // CALCULATE TOTAL IN NPR
        // =================================================

        const totalAmount =
            showPrice *
            uniqueSeats.length;

        // =================================================
        // CREATE BOOKING
        // Amount is stored in NPR
        // =================================================

        const booking =
            await Booking.create({
                user:
                    String(userId),

                show:
                    String(showId),

                amount:
                    totalAmount,

                bookedSeats:
                    uniqueSeats,

                isPaid:
                    false,
            });

        // =================================================
        // UPDATE OCCUPIED SEATS
        // =================================================

        if (
            !showData.occupiedSeats
        ) {
            showData.occupiedSeats = {};
        }

        uniqueSeats.forEach(
            (seat) => {
                showData.occupiedSeats[
                    seat
                ] = String(userId);
            }
        );

        showData.markModified(
            "occupiedSeats"
        );

        await showData.save();

        // =================================================
        // GET USER EMAIL
        // =================================================

        const userEmail =
            req.user?.email ||
            req.body?.email;

        const userName =
            req.user?.name ||
            req.body?.name ||
            "Customer";

        // =================================================
        // SEND BOOKING CONFIRMATION EMAIL
        // =================================================

        if (userEmail) {
            try {
                const movieTitle =
                    showData.movie?.title ||
                    "Movie";

                const showDate =
                    showData.showDateTime
                        ? new Date(
                            showData.showDateTime
                        ).toLocaleDateString(
                            "en-US"
                        )
                        : "N/A";

                const showTime =
                    showData.showDateTime
                        ? new Date(
                            showData.showDateTime
                        ).toLocaleTimeString(
                            "en-US",
                            {
                                hour: "2-digit",
                                minute: "2-digit",
                            }
                        )
                        : "N/A";

                const emailResult =
                    await sendBookingConfirmationEmail({
                        email:
                            userEmail,

                        name:
                            userName,

                        movieTitle:
                            movieTitle,

                        showDate:
                            showDate,

                        showTime:
                            showTime,

                        seats:
                            uniqueSeats,

                        amount:
                            totalAmount,

                        bookingId:
                            booking._id.toString(),
                    });

                if (
                    emailResult?.success
                ) {
                    console.log(
                        "======================================"
                    );

                    console.log(
                        "BOOKING CONFIRMATION EMAIL SENT"
                    );

                    console.log(
                        "Email:",
                        userEmail
                    );

                    console.log(
                        "Booking ID:",
                        booking._id
                    );

                    console.log(
                        "======================================"
                    );

                } else {
                    console.log(
                        "Booking created, but email could not be sent."
                    );

                    console.log(
                        "Email error:",
                        emailResult?.error
                    );
                }

            } catch (emailError) {
                console.error(
                    "EMAIL ERROR:",
                    emailError.message
                );
            }

        } else {
            console.log(
                "No user email found. Confirmation email was not sent."
            );
        }

        // =================================================
        // GET COMPLETE BOOKING
        // =================================================

        const populatedBooking =
            await Booking.findById(
                booking._id
            ).populate({
                path: "show",
                populate: {
                    path: "movie",
                },
            });

        // =================================================
        // SUCCESS LOGS
        // =================================================

        console.log(
            "======================================"
        );

        console.log(
            "BOOKING CREATED SUCCESSFULLY"
        );

        console.log(
            "Booking ID:",
            booking._id
        );

        console.log(
            "Movie:",
            showData.movie?.title
        );

        console.log(
            "Show date/time:",
            showData.showDateTime
        );

        console.log(
            "Show price:",
            showPrice
        );

        console.log(
            "Seats:",
            uniqueSeats
        );

        console.log(
            "Total NPR:",
            totalAmount
        );

        console.log(
            "======================================"
        );

        // =================================================
        // RETURN SUCCESS
        // =================================================

        return res.status(201).json({
            success: true,

            message:
                "Booking successful.",

            booking:
                populatedBooking,

            currency:
                "NPR",
        });

    } catch (error) {
        console.error(
            "CREATE BOOKING ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to create booking.",
        });
    }
};


// =====================================================
// GET OCCUPIED SEATS
// GET /booking/seats/:showId
// =====================================================

export const getOccupiedSeats = async (
    req,
    res
) => {
    try {
        const {
            showId,
        } = req.params;

        // =================================================
        // VALIDATE SHOW ID
        // =================================================

        if (!showId) {
            return res.status(400).json({
                success: false,
                message:
                    "Show ID is required.",
            });
        }

        // =================================================
        // GET SHOW
        // =================================================

        const showData =
            await Show.findById(
                showId
            );

        if (!showData) {
            return res.status(404).json({
                success: false,
                message:
                    "Show not found.",
            });
        }

        // =================================================
        // GET OCCUPIED SEATS
        // =================================================

        const occupiedSeats =
            Object.keys(
                showData.occupiedSeats || {}
            );

        // =================================================
        // RETURN OCCUPIED SEATS
        // =================================================

        return res.status(200).json({
            success: true,
            occupiedSeats,
        });

    } catch (error) {
        console.error(
            "Get Occupied Seats Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message,
        });
    }
};


// =====================================================
// GET ALL BOOKINGS
// GET /booking/all
// =====================================================

export const getAllBookings = async (
    req,
    res
) => {
    try {
        const bookings =
            await Booking.find()
                .populate({
                    path: "show",
                    populate: {
                        path: "movie",
                    },
                })
                .sort({
                    createdAt: -1,
                });

        return res.status(200).json({
            success: true,
            bookings,
            currency: "NPR",
        });

    } catch (error) {
        console.error(
            "Get All Bookings Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message,
        });
    }
};


// =====================================================
// GET ONE BOOKING
// GET /booking/:bookingId
// =====================================================

export const getBookingById = async (
    req,
    res
) => {
    try {
        const {
            bookingId,
        } = req.params;

        // =================================================
        // VALIDATE BOOKING ID
        // =================================================

        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message:
                    "Booking ID is required.",
            });
        }

        // =================================================
        // GET BOOKING
        // =================================================

        const booking =
            await Booking.findById(
                bookingId
            ).populate({
                path: "show",
                populate: {
                    path: "movie",
                },
            });

        // =================================================
        // CHECK BOOKING
        // =================================================

        if (!booking) {
            return res.status(404).json({
                success: false,
                message:
                    "Booking not found.",
            });
        }

        // =================================================
        // RETURN BOOKING
        // =================================================

        return res.status(200).json({
            success: true,
            booking,
            currency: "NPR",
        });

    } catch (error) {
        console.error(
            "Get Booking Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message,
        });
    }
};


// =====================================================
// CREATE STRIPE CHECKOUT SESSION
// POST /booking/stripe/create-checkout-session/:bookingId
// =====================================================

export const createStripeCheckoutSession = async (
    req,
    res
) => {
    try {
        const {
            bookingId,
        } = req.params;

        // =================================================
        // GET USER ID
        // =================================================

        const userId =
            getUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message:
                    "User is not authenticated.",
            });
        }

        // =================================================
        // GET BOOKING
        // =================================================

        const booking =
            await Booking.findById(
                bookingId
            ).populate({
                path: "show",
                populate: {
                    path: "movie",
                },
            });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message:
                    "Booking not found.",
            });
        }

        // =================================================
        // CHECK BOOKING OWNER
        // =================================================

        if (
            booking.user &&
            booking.user.toString() !==
                userId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not authorized to pay for this booking.",
            });
        }

        // =================================================
        // CHECK PAYMENT STATUS
        // =================================================

        if (booking.isPaid) {
            return res.status(400).json({
                success: false,
                message:
                    "This booking has already been paid.",
            });
        }

        // =================================================
        // GET NPR AMOUNT
        // =================================================

        const nprAmount =
            Number(booking.amount);

        if (
            !Number.isFinite(nprAmount) ||
            nprAmount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid booking amount.",
            });
        }

        // =================================================
        // NPR → PAISE
        //
        // NPR has 2 decimal places.
        //
        // Example:
        // NPR 1000 = 100000 paisa
        // =================================================

        const amountInPaisa =
            Math.round(
                nprAmount * 100
            );

        // =================================================
        // GET MOVIE NAME
        // =================================================

        const movieName =
            booking.show?.movie?.title ||
            "Movie Ticket";

        // =================================================
        // GET SEATS
        // =================================================

        const seats =
            booking.bookedSeats?.join(
                ", "
            ) ||
            "Selected seats";

        // =================================================
        // CREATE STRIPE CHECKOUT SESSION
        // =================================================

        const session =
            await stripe.checkout.sessions.create({
                mode: "payment",

                payment_method_types: [
                    "card",
                ],

                line_items: [
                    {
                        price_data: {
                            currency: "npr",

                            product_data: {
                                name:
                                    movieName,

                                description:
                                    `Seats: ${seats}`,
                            },

                            unit_amount:
                                amountInPaisa,
                        },

                        quantity: 1,
                    },
                ],

                metadata: {
                    bookingId:
                        booking._id.toString(),

                    amountNPR:
                        nprAmount.toString(),

                    currency:
                        "npr",
                },

                success_url:
                    `${process.env.CLIENT_URL}/payment-result?payment=success&session_id={CHECKOUT_SESSION_ID}`,

                cancel_url:
                    `${process.env.CLIENT_URL}/payment-result?payment=cancelled`,
            });

        // =================================================
        // RETURN STRIPE SESSION
        // =================================================

        return res.status(200).json({
            success: true,

            sessionId:
                session.id,

            payment_url:
                session.url,

            amount:
                nprAmount,

            currency:
                "NPR",
        });

    } catch (error) {
        console.error(
            "Stripe checkout session error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to create Stripe checkout session.",
            error:
                error.message,
        });
    }
};


// =====================================================
// VERIFY STRIPE PAYMENT
// POST /booking/stripe/verify
// =====================================================

export const verifyStripePayment = async (
    req,
    res
) => {
    try {
        const {
            sessionId,
        } = req.body;

        // =================================================
        // GET USER ID
        // =================================================

        const userId =
            getUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message:
                    "User is not authenticated.",
            });
        }

        // =================================================
        // VALIDATE SESSION ID
        // =================================================

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message:
                    "Stripe session ID is required.",
            });
        }

        // =================================================
        // GET CHECKOUT SESSION
        // =================================================

        const session =
            await stripe.checkout.sessions.retrieve(
                sessionId
            );

        if (!session) {
            return res.status(404).json({
                success: false,
                message:
                    "Stripe session not found.",
            });
        }

        // =================================================
        // GET BOOKING ID
        // =================================================

        const bookingId =
            session.metadata?.bookingId;

        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message:
                    "Booking ID missing from Stripe session.",
            });
        }

        // =================================================
        // GET BOOKING
        // =================================================

        const booking =
            await Booking.findById(
                bookingId
            );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message:
                    "Booking not found.",
            });
        }

        // =================================================
        // CHECK BOOKING OWNER
        // =================================================

        if (
            booking.user &&
            booking.user.toString() !==
                userId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not authorized to verify this payment.",
            });
        }

        // =================================================
        // CHECK IF ALREADY PAID
        // =================================================

        if (booking.isPaid) {
            return res.status(200).json({
                success: true,
                message:
                    "Booking is already marked as paid.",
                booking,
            });
        }

        // =================================================
        // CHECK PAYMENT STATUS
        // =================================================

        if (
            session.payment_status !==
            "paid"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Payment has not been completed.",
                payment_status:
                    session.payment_status,
            });
        }

        // =================================================
        // CHECK CURRENCY
        // =================================================

        if (
            session.currency?.toLowerCase() !==
            "npr"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid payment currency.",
                expected:
                    "npr",
                received:
                    session.currency,
            });
        }

        // =================================================
        // CHECK PAYMENT AMOUNT
        // =================================================

        const expectedAmountInPaisa =
            Math.round(
                Number(booking.amount) *
                    100
            );

        const paidAmountInPaisa =
            Number(
                session.amount_total
            );

        if (
            !Number.isFinite(
                paidAmountInPaisa
            ) ||
            paidAmountInPaisa !==
                expectedAmountInPaisa
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Payment amount does not match booking amount.",
                expected:
                    expectedAmountInPaisa,
                received:
                    paidAmountInPaisa,
            });
        }

        // =================================================
        // MARK BOOKING AS PAID
        // =================================================

        booking.isPaid = true;

        // =================================================
        // SAVE PAYMENT INFORMATION
        // =================================================

        booking.paymentMethod =
            "Stripe";

        booking.paymentId =
            session.payment_intent ||
            session.id;

        await booking.save();

        // =================================================
        // RETURN SUCCESS
        // =================================================

        return res.status(200).json({
            success: true,

            message:
                "Payment verified successfully.",

            booking,

            amount:
                booking.amount,

            currency:
                "NPR",
        });

    } catch (error) {
        console.error(
            "Stripe payment verification error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Payment verification failed.",
            error:
                error.message,
        });
    }
};
