import express from "express";

import {
    seedTheaters,
    getNearbyTheaters,
    getAllTheaters,
    getTheaterById,
    addTheater,
    updateTheater,
    deleteTheater,
    getTheatersWithMovies,
} from "../controllers/theaterController.js";

const router = express.Router();

// ==========================================
// SPECIAL / STATIC ROUTES FIRST
// ==========================================

router.get("/nearby", getNearbyTheaters);

router.get("/all", getAllTheaters);

router.get("/with-movies", getTheatersWithMovies);

// ==========================================
// ADD THEATER
// ==========================================

router.post("/", addTheater);

// ==========================================
// UPDATE THEATER
// ==========================================

router.put("/:id", updateTheater);

// ==========================================
// DELETE THEATER
// ==========================================

router.delete("/:id", deleteTheater);

// ==========================================
// GET THEATER BY ID
// ==========================================
// IMPORTANT: Keep this AFTER /with-movies,
// /nearby and /all.

router.get("/:id", getTheaterById);

export default router;