import express from "express";
import {
    addShow,
    getAllShows,
    getShow,
    getUniqueShows,
    getNowShowingMovies,
    getMovieById,
    searchMovies,
    getShowsByTheater,
    deleteShow, // Import delete function
} from "../controllers/showController.js";

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

router.get(
    "/theater/:theaterId",
    getShowsByTheater
);
// =====================================================
// DYNAMIC ROUTE – MUST BE LAST
// =====================================================
router.get("/:movieId", getShow);


export default router;