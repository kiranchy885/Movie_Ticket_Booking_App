import Booking from "../models/Booking.js";

// =====================================================
// DATE RANGE HELPER
// =====================================================

const getDateRange = (from, to) => {
    const startDate = from
        ? new Date(`${from}T00:00:00.000Z`)
        : new Date("2000-01-01T00:00:00.000Z");

    const endDate = to
        ? new Date(`${to}T23:59:59.999Z`)
        : new Date();

    return {
        startDate,
        endDate,
    };
};

// =====================================================
// DAILY BOOKING ANALYTICS
// =====================================================

export const getDailyAnalytics = async (req, res) => {
    try {
        const { from, to } = req.query;

        const { startDate, endDate } =
            getDateRange(from, to);

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
        console.error(
            "Daily analytics error:",
            error
        );

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
        const bookings = await Booking.find().populate({
            path: "show",
            populate: {
                path: "movie",
            },
        });

        const movieStats = {};

        bookings.forEach((booking) => {
            const movieTitle =
                booking.show?.movie?.title ||
                booking.movieName ||
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

            movieStats[movieTitle].seats +=
                Array.isArray(booking.bookedSeats)
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
        const bookings = await Booking.find();

        const showtimeStats = {};

        bookings.forEach((booking) => {
            if (!booking.showDateTime) {
                return;
            }

            const date = new Date(
                booking.showDateTime
            );

            if (Number.isNaN(date.getTime())) {
                return;
            }

            const time = date.toLocaleTimeString(
                "en-US",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                }
            );

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
            message:
                "Failed to load showtime analytics",
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
            message:
                "Failed to load booking status analytics",
            error: error.message,
        });
    }
};

// =====================================================
// COMPLETE REAL-TIME DASHBOARD ANALYTICS
// =====================================================

export const getDashboardAnalytics = async (
    req,
    res
) => {
    try {
        const { from, to } = req.query;

        const { startDate, endDate } =
            getDateRange(from, to);

        // =================================================
        // BOOKINGS FOR SELECTED DATE RANGE
        // =================================================

        const bookings = await Booking.find({
            createdAt: {
                $gte: startDate,
                $lte: endDate,
            },
        })
            .sort({ createdAt: -1 })
            .lean();

        // =================================================
        // SUMMARY
        // =================================================

        let totalBookings = 0;
        let paidBookings = 0;
        let pendingBookings = 0;
        let totalRevenue = 0;
        let totalSeats = 0;

        bookings.forEach((booking) => {
            totalBookings += 1;

            const seatCount = Array.isArray(
                booking.bookedSeats
            )
                ? booking.bookedSeats.length
                : 0;

            totalSeats += seatCount;

            if (booking.isPaid === true) {
                paidBookings += 1;

                totalRevenue += Number(
                    booking.amount || 0
                );
            } else {
                pendingBookings += 1;
            }
        });

        // =================================================
        // TODAY'S DATA
        // =================================================

        const now = new Date();

        const todayStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0,
            0,
            0,
            0
        );

        const todayEnd = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            0,
            0,
            0,
            0
        );

        const todayBookings = bookings.filter(
            (booking) => {
                const createdAt = new Date(
                    booking.createdAt
                );

                return (
                    createdAt >= todayStart &&
                    createdAt < todayEnd
                );
            }
        );

        let todayRevenue = 0;
        let todaySeats = 0;

        todayBookings.forEach((booking) => {
            if (booking.isPaid === true) {
                todayRevenue += Number(
                    booking.amount || 0
                );
            }

            todaySeats += Array.isArray(
                booking.bookedSeats
            )
                ? booking.bookedSeats.length
                : 0;
        });

        // =================================================
        // BOOKING TREND
        // =================================================

        const trendMap = {};

        bookings.forEach((booking) => {
            const date = new Date(
                booking.createdAt
            )
                .toISOString()
                .split("T")[0];

            if (!trendMap[date]) {
                trendMap[date] = {
                    date,
                    bookings: 0,
                    paidBookings: 0,
                    revenue: 0,
                };
            }

            trendMap[date].bookings += 1;

            if (booking.isPaid === true) {
                trendMap[date].paidBookings += 1;

                trendMap[date].revenue += Number(
                    booking.amount || 0
                );
            }
        });

        const bookingTrend = Object.values(
            trendMap
        ).sort((a, b) =>
            a.date.localeCompare(b.date)
        );

        // =================================================
        // MOVIE ANALYSIS
        // =================================================

        const movieMap = {};

        bookings.forEach((booking) => {
            const movie =
                booking.movieName ||
                "Unknown Movie";

            if (!movieMap[movie]) {
                movieMap[movie] = {
                    movie,
                    bookings: 0,
                    seats: 0,
                    revenue: 0,
                };
            }

            movieMap[movie].bookings += 1;

            movieMap[movie].seats +=
                Array.isArray(booking.bookedSeats)
                    ? booking.bookedSeats.length
                    : 0;

            if (booking.isPaid === true) {
                movieMap[movie].revenue += Number(
                    booking.amount || 0
                );
            }
        });

        const movies = Object.values(movieMap).sort(
            (a, b) =>
                b.bookings - a.bookings
        );

        // =================================================
        // SHOWTIME ANALYSIS
        // =================================================

        const showtimeMap = {};

        bookings.forEach((booking) => {
            if (!booking.showDateTime) {
                return;
            }

            const date = new Date(
                booking.showDateTime
            );

            if (Number.isNaN(date.getTime())) {
                return;
            }

            const time = date.toLocaleTimeString(
                "en-US",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                }
            );

            if (!showtimeMap[time]) {
                showtimeMap[time] = {
                    time,
                    bookings: 0,
                    seats: 0,
                };
            }

            showtimeMap[time].bookings += 1;

            showtimeMap[time].seats +=
                Array.isArray(booking.bookedSeats)
                    ? booking.bookedSeats.length
                    : 0;
        });

        const showtimes = Object.values(
            showtimeMap
        ).sort((a, b) =>
            a.time.localeCompare(b.time)
        );

        // =================================================
        // PAYMENT STATUS
        // =================================================

        const bookingStatus = [
            {
                name: "Paid",
                value: paidBookings,
            },
            {
                name: "Unpaid",
                value: pendingBookings,
            },
        ];

        // =================================================
        // RECENT BOOKINGS
        // =================================================

        const recentBookings = bookings
            .slice(0, 10)
            .map((booking) => ({
                _id: booking._id,
                movieName:
                    booking.movieName ||
                    "Unknown Movie",
                amount: Number(
                    booking.amount || 0
                ),
                seats: Array.isArray(
                    booking.bookedSeats
                )
                    ? booking.bookedSeats
                    : [],
                isPaid:
                    booking.isPaid === true,
                showDateTime:
                    booking.showDateTime,
                createdAt:
                    booking.createdAt,
            }));

        // =================================================
        // RESPONSE
        // =================================================

        return res.status(200).json({
            success: true,

            data: {
                summary: {
                    totalBookings,
                    paidBookings,
                    pendingBookings,
                    totalRevenue,
                    totalSeats,
                    todayBookings:
                        todayBookings.length,
                    todayRevenue,
                    todaySeats,
                },

                bookingTrend,

                movies,

                showtimes,

                bookingStatus,

                recentBookings,
            },
        });
    } catch (error) {
        console.error(
            "Dashboard analytics error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to load dashboard analytics",
            error: error.message,
        });
    }
};