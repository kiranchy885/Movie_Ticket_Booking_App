import express from "express";

import {
    getDailyAnalytics,
    getMovieAnalytics,
    getShowtimeAnalytics,
    getBookingStatusAnalytics,
    getDashboardAnalytics,
} from "../controllers/analyticsController.js";

const analyticsRouter =
    express.Router();

// NEW COMPLETE DASHBOARD ANALYTICS

analyticsRouter.get(
    "/dashboard",
    getDashboardAnalytics
);

// EXISTING DAILY ANALYTICS

analyticsRouter.get(
    "/daily",
    getDailyAnalytics
);

// EXISTING MOVIE ANALYTICS

analyticsRouter.get(
    "/movies",
    getMovieAnalytics
);

// EXISTING SHOWTIME ANALYTICS

analyticsRouter.get(
    "/showtimes",
    getShowtimeAnalytics
);

// EXISTING STATUS ANALYTICS

analyticsRouter.get(
    "/status",
    getBookingStatusAnalytics
);

export default analyticsRouter;