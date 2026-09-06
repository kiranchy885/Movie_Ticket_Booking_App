import express from "express";

import {
    getDailyAnalytics,
    getMovieAnalytics,
    getShowtimeAnalytics,
    getBookingStatusAnalytics,
} from "../controllers/analyticsController.js";

const analyticsRouter = express.Router();

analyticsRouter.get(
    "/daily",
    getDailyAnalytics
);

analyticsRouter.get(
    "/movies",
    getMovieAnalytics
);

analyticsRouter.get(
    "/showtimes",
    getShowtimeAnalytics
);

analyticsRouter.get(
    "/status",
    getBookingStatusAnalytics
);

export default analyticsRouter;