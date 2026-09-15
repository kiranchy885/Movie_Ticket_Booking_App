import express from "express";

import {
    getRecommendations
} from "../controllers/recommendationController.js";

import { protect } from "../middleWare/auth.js";

const recommendationRouter =
    express.Router();

recommendationRouter.get(
    "/",
    protect,
    getRecommendations
);

export default recommendationRouter;