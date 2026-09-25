import express from "express";
import {
    getMovies,
    addMovie,
    getMovieById,
    searchMovies,
    rateMovie,
    getMovieRatings,
} from "../controllers/showController.js";

import { protect } from "../middleware/auth.js";   // ← यही नाम

const router = express.Router();

// =====================================================
// Specific routes FIRST
// =====================================================
router.get("/movie/all", getMovies);
router.get("/movie/search", searchMovies);

// =====================================================
// RATING ROUTES — protected
// =====================================================
router.get("/movie/:id/ratings", protect, getMovieRatings);
router.post("/movie/:id/rate", protect, rateMovie);

// =====================================================
// Param routes LAST
// =====================================================
router.get("/movie/:id", getMovieById);
router.post("/movie/add", addMovie);

export default router;