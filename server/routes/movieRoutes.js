import express from "express";

import {
  addMovie,
  getMovies,
} from "../controllers/movieController.js";

const movieRouter = express.Router();

// =====================================================
// ADD MOVIE
// POST: /api/movie/add
// =====================================================

movieRouter.post("/add", addMovie);

// =====================================================
// GET ALL MOVIES
// GET: /api/movie/all
// =====================================================

movieRouter.get("/all", getMovies);

export default movieRouter;