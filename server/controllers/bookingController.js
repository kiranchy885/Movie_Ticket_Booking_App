import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";

import {
  initiateKhaltiPayment,
  lookupKhaltiPayment,
} from "../services/khaltiService.js";

import {
  sendBookingConfirmationEmail,
} from "../services/emailService.js";

const HOLD_TIME = Number(
  process.env.SEAT_HOLD_MINUTES || 15
);

// ----------------------------------------------------
// Remove expired seat holds
// ----------------------------------------------------

const releaseExpiredBookings = async (showId) => {
  const expiredBookings = await Booking.find({
    show: showId,
    status: "PENDING",
    holdExpiresAt: {
      $lte: new Date(),
    },
  });

  for (const booking of expiredBookings) {
    await Show.findByIdAndUpdate(
      showId,
      {
        $unset: Object.fromEntries(
          booking.bookedSeats.map((seat) => [
            `occupiedSeats.${seat}`,
            1,
          ])
        ),
      }
    );

    booking.status = "CANCELLED";

    await booking.save();
  }
};

// ----------------------------------------------------
// CREATE BOOKING + TEMPORARILY RESERVE SEATS
// ----------------------------------------------------

export const createBooking = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      showId,
      selectedSeats,
    } = req.body;

    if (!showId || !selectedSeats?.length) {
      return res.status(400).json({
        success: false,
        message: "Show and seats are required.",
      });
    }

    // Prevent duplicate seats in same request
    const uniqueSeats = [
      ...new Set(selectedSeats),
    ];

    if (uniqueSeats.length !== selectedSeats.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate seats selected.",
      });
    }

    // Maximum 5 seats
    if (uniqueSeats.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Maximum 5 seats allowed.",
      });
    }

    await releaseExpiredBookings(showId);

    const show = await Show.findById(showId).populate(
      "movie"
    );

    if (!show) {
      return res.status(404).json({
        success: false,
        message: "Show not found.",
      });
    }

    // ------------------------------------------------
    // ATOMIC SEAT CHECK
    // ------------------------------------------------

    const seatConditions = uniqueSeats.map(
      (seat) => ({
        [`occupiedSeats.${seat}`]: {
          $exists: false,
        },
      })
    );

    const holdExpiresAt = new Date(
      Date.now() + HOLD_TIME * 60 * 1000
    );

    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount:
        show.showPrice * uniqueSeats.length,
      bookedSeats: uniqueSeats,
      isPaid: false,
      status: "PENDING",
      holdExpiresAt,
    });

    // Add booking ID as temporary seat owner
    const seatUpdates = {};

    uniqueSeats.forEach((seat) => {
      seatUpdates[`occupiedSeats.${seat}`] =
        booking._id.toString();
    });

    /*
      IMPORTANT:

      This update succeeds only when ALL selected
      seats are still empty.

      Therefore two users cannot reserve the
      same seat at the same time.
    */

    const reservedShow =
      await Show.findOneAndUpdate(
        {
          _id: showId,

          $and: seatConditions,
        },

        {
          $set: seatUpdates,
        },

        {
          new: true,
        }
      );

    if (!reservedShow) {
      await Booking.findByIdAndUpdate(
        booking._id,
        {
          status: "CANCELLED",
        }
      );

      return res.status(409).json({
        success: false,
        message:
          "One or more selected seats have already been booked.",
      });
    }

    // ------------------------------------------------
    // GET USER
    // ------------------------------------------------

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // ------------------------------------------------
    // CREATE KHALTI PAYMENT
    // ------------------------------------------------

    const payment = await initiateKhaltiPayment({
      amount: booking.amount,

      purchaseOrderId:
        booking._id.toString(),

      purchaseOrderName:
        show.movie.title,

      customer: {
        name: user.name,
        email: user.email,
        phone: "9800000000",
      },
    });

    booking.pidx = payment.pidx;

    booking.paymentLink =
      payment.payment_url;

    await booking.save();

    return res.status(201).json({
      success: true,

      message:
        "Seats reserved. Continue to payment.",

      bookingId: booking._id,

      amount: booking.amount,

      paymentUrl:
        payment.payment_url,

      pidx: payment.pidx,

      expiresAt: holdExpiresAt,
    });
  } catch (error) {
    console.error(
      "Create booking error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ----------------------------------------------------
// VERIFY KHALTI PAYMENT
// ----------------------------------------------------

export const verifyPayment = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const {
      bookingId,
      pidx,
    } = req.body;

    const booking =
      await Booking.findById(bookingId).populate({
        path: "show",
        populate: {
          path: "movie",
        },
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    // Make sure user owns this booking
    if (booking.user !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized booking.",
      });
    }

    if (booking.status === "CONFIRMED") {
      return res.json({
        success: true,
        message: "Booking already confirmed.",
        booking,
      });
    }

    // Verify pidx
    if (!pidx || pidx !== booking.pidx) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment identifier.",
      });
    }

    const payment =
      await lookupKhaltiPayment(pidx);

    /*
      ONLY Completed is successful.
    */

    if (payment.status !== "Completed") {
      return res.status(400).json({
        success: false,
        message:
          `Payment status: ${payment.status}`,
      });
    }

    // Verify amount
    const expectedAmount =
      booking.amount * 100;

    if (
      Number(payment.total_amount) !==
      Number(expectedAmount)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount verification failed.",
      });
    }

    // ------------------------------------------------
    // CONFIRM BOOKING
    // ------------------------------------------------

    booking.isPaid = true;

    booking.status = "CONFIRMED";

    booking.transactionId =
      payment.transaction_id;

    booking.holdExpiresAt = null;

    await booking.save();

    // ------------------------------------------------
    // Change seat ownership from booking ID
    // to actual user ID
    // ------------------------------------------------

    const seatUpdates = {};

    booking.bookedSeats.forEach(
      (seat) => {
        seatUpdates[
          `occupiedSeats.${seat}`
        ] = userId;
      }
    );

    await Show.findByIdAndUpdate(
      booking.show._id,
      {
        $set: seatUpdates,
      }
    );

    // ------------------------------------------------
    // SEND EMAIL
    // ------------------------------------------------

    const user =
      await User.findById(userId);

    if (user?.email) {
      try {
        await sendBookingConfirmationEmail({
          email: user.email,

          name: user.name,

          movie:
            booking.show.movie.title,

          showDateTime:
            booking.show.showDateTime,

          seats:
            booking.bookedSeats,

          amount:
            booking.amount,

          bookingId:
            booking._id.toString(),

          transactionId:
            booking.transactionId,
        });
      } catch (emailError) {
        console.error(
          "Email failed:",
          emailError.message
        );
      }
    }

    return res.json({
      success: true,

      message:
        "Payment successful. Booking confirmed.",

      booking,
    });
  } catch (error) {
    console.error(
      "Payment verification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ----------------------------------------------------
// GET OCCUPIED SEATS
// ----------------------------------------------------

export const getOccupiedSeats = async (
  req,
  res
) => {
  try {
    const { showId } = req.params;

    await releaseExpiredBookings(showId);

    const show =
      await Show.findById(showId);

    if (!show) {
      return res.status(404).json({
        success: false,
        message: "Show not found.",
      });
    }

    const occupiedSeats =
      Object.keys(show.occupiedSeats || {});

    res.json({
      success: true,
      occupiedSeats,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ----------------------------------------------------
// GET USER BOOKINGS
// ----------------------------------------------------

export const getUserBookings = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const bookings =
      await Booking.find({
        user: userId,
      })
        .populate({
          path: "show",
          populate: {
            path: "movie",
          },
        })
        .sort({
          createdAt: -1,
        });

    res.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};