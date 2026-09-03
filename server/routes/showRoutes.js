import express from "express";

import {
    getShow,
    searchMovies, //new
    getMovies,// new
    getUniqueShows,
    getNowShowingMovies,
} from "../controllers/showController.js";

const router = express.Router();

// GET MOVIES
router.get("/all", getMovies);

// SEARCH
router.get("/search", searchMovies);

// Get now-playing movies
router.get("/now-playing", getNowShowingMovies);

// Get all shows

// Get unique movie IDs
router.get("/unique", getUniqueShows);

// Add a new show

// Get shows for one movie
// IMPORTANT: Keep this LAST
router.get("/:movieId", getShow);

export default router;