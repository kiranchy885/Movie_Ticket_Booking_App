import express from "express";
import { getNearestCenters } from "../controllers/centerController.js";

const centerRouter = express.Router();

// GET nearest movie centers
// /api/center/nearest?latitude=27.7172&longitude=85.3240

centerRouter.get("/nearest", getNearestCenters);

export default centerRouter;