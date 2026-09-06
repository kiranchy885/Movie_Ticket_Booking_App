import Booking from "../models/Booking.js";
import Show from "../models/Show.js";

// =====================================================
// DAILY BOOKING ANALYTICS
// =====================================================

export const getDailyAnalytics = async (req, res) => {
    try {
        const { from, to } = req.query;

        const startDate = from
            ? new Date(`${from}T00:00:00.000Z`)
            : new Date("2000-01-01T00:00:00.000Z");

        const endDate = to
            ? new Date(`${to}T23:59:59.999Z`)
            : new Date();

        const bookings = await Booking.find({
            createdAt: {
                $gte: startDate,
                $lte: endDate,
            },
        }).sort({ createdAt: 1 });

        const dailyStats = {};

        bookings.forEach((booking) => {
            const date = new Date(booking.createdAt)
                .toISOString()
                .split("T")[0];

            if (!dailyStats[date]) {
                dailyStats[date] = {
                    date,
                    bookings: 0,
                    revenue: 0,
                    seats: 0,
                };
            }

            dailyStats[date].bookings += 1;

            dailyStats[date].revenue += Number(
                booking.amount || 0
            );

            dailyStats[date].seats += Array.isArray(
                booking.bookedSeats
            )
                ? booking.bookedSeats.length
                : 0;
        });

        return res.status(200).json({
            success: true,
            data: Object.values(dailyStats),
        });

    } catch (error) {
        console.error("Daily analytics error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load daily analytics",
            error: error.message,
        });
    }
};


// =====================================================
// MOVIE-WISE BOOKING ANALYTICS
// =====================================================

export const getMovieAnalytics = async (req, res) => {
    try {

        const bookings = await Booking.find()
            .populate({
                path: "show",
                populate: {
                    path: "movie",
                },
            });

        const movieStats = {};

        bookings.forEach((booking) => {

            const movieTitle =
                booking.show?.movie?.title ||
                "Unknown Movie";

            if (!movieStats[movieTitle]) {
                movieStats[movieTitle] = {
                    movie: movieTitle,
                    bookings: 0,
                    seats: 0,
                    revenue: 0,
                };
            }

            movieStats[movieTitle].bookings += 1;

            movieStats[movieTitle].seats += Array.isArray(
                booking.bookedSeats
            )
                ? booking.bookedSeats.length
                : 0;

            movieStats[movieTitle].revenue += Number(
                booking.amount || 0
            );
        });

        return res.status(200).json({
            success: true,
            data: Object.values(movieStats),
        });

    } catch (error) {

        console.error(
            "Movie analytics error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load movie analytics",
            error: error.message,
        });
    }
};


// =====================================================
// SHOWTIME ANALYTICS
// =====================================================

export const getShowtimeAnalytics = async (req, res) => {
    try {

        const bookings = await Booking.find()
            .populate("show");

        const showtimeStats = {};

        bookings.forEach((booking) => {

            const show = booking.show;

            if (!show?.showDateTime) {
                return;
            }

            const time = new Date(
                show.showDateTime
            ).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
            });

            if (!showtimeStats[time]) {
                showtimeStats[time] = {
                    name: time,
                    value: 0,
                };
            }

            const seats = Array.isArray(
                booking.bookedSeats
            )
                ? booking.bookedSeats.length
                : 0;

            showtimeStats[time].value += seats;
        });

        return res.status(200).json({
            success: true,
            data: Object.values(showtimeStats),
        });

    } catch (error) {

        console.error(
            "Showtime analytics error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load showtime analytics",
            error: error.message,
        });
    }
};


// =====================================================
// PAYMENT STATUS ANALYTICS
// =====================================================

export const getBookingStatusAnalytics = async (
    req,
    res
) => {
    try {

        const bookings = await Booking.find();

        let paid = 0;
        let unpaid = 0;

        bookings.forEach((booking) => {

            if (booking.isPaid === true) {
                paid += 1;
            } else {
                unpaid += 1;
            }

        });

        const data = [
            {
                name: "Paid",
                value: paid,
            },
            {
                name: "Unpaid",
                value: unpaid,
            },
        ];

        return res.status(200).json({
            success: true,
            data,
        });

    } catch (error) {

        console.error(
            "Booking status analytics error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load booking status analytics",
            error: error.message,
        });
    }
};