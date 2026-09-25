import express from "express";
import {
    addShow,
    getAllShows,
    getShow,
    getUniqueShows,
    getNowShowingMovies,
    getMovieById,
    searchMovies,
 // Rating functions
    rateMovie,
    getMovieRatings,
    deleteShow, // Import delete function
} from "../controllers/showController.js";
import { protect } from "../middleWare/auth.js";
const router = express.Router();

// =====================================================
// STATIC ROUTES (must be before dynamic routes)
// =====================================================

// NOW SHOWING MOVIES
router.get("/now-playing", getNowShowingMovies);

// ALL SHOWS
router.get("/all", getAllShows);

// UNIQUE SHOW MOVIES
router.get("/unique", getUniqueShows);

// SEARCH MOVIES (for navbar)
router.get("/search", searchMovies);

// Get ratings
// GET /api/movie/:id/ratings
router.get("/movie/:id/ratings", getMovieRatings);

// Submit/update rating
// POST /api/movie/:id/rate
router.post("/movie/:id/rate", protect, rateMovie);
// =====================================================
// PROTECTED ROUTE (Admin only)
// =====================================================
router.post("/add", addShow);

// =====================================================
// GET SINGLE MOVIE BY ID (for favourites fallback)
// =====================================================
router.get("/movie/:id", getMovieById);

// =====================================================
// DELETE SHOW ROUTE
// =====================================================
router.delete("/:id", deleteShow);

// router.get(
//     "/theater/:theaterId",
//     getShowsByTheater
// );
// =====================================================
// DYNAMIC ROUTE – MUST BE LAST
// =====================================================
router.get("/:movieId", getShow);


export default router;