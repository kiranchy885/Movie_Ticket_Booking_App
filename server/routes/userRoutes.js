import express from "express";

import {
    getUserBookings,
    updateFavorites,
    getFavorites
} from "../controllers/userController.js";

import { protect } from "../middleWare/auth.js";


const userRouter = express.Router();


// Get logged-in user's bookings
userRouter.get(
    "/bookings",
    protect,
    getUserBookings
);


// Add/remove favorite movie
userRouter.post(
    "/update-favorite",
    protect,
    updateFavorites
);


// Get favorite movies
userRouter.get(
    "/favorites",
    protect,
    getFavorites
);


export default userRouter;