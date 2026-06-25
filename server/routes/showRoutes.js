import express from "express";
import { getMovies } from "../controllers/showController.js";

const showRouter = express.Router();

showRouter.get("/now-playing", getMovies);

export default showRouter;