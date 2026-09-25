import express from "express";

import {
    getMovieRecommendations,
} from "../controllers/recommendationController.js";

const router = express.Router();

// =====================================================
// MOVIE RECOMMENDATIONS
// =====================================================
// Example:
// GET /recommendations/movie/123?userId=USER_ID
//
// For guest users:
// GET /recommendations/movie/123
// =====================================================

router.get("/movie/:movieId", getMovieRecommendations);

export default router;