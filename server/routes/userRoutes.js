import express from "express";

import {
  loginUser,
  signupUser,
  getCurrentUser,
  getMyBookings,
  getFavorites,

} from "../controllers/userController.js";

import { protect } from "../middleWare/auth.js";

const router = express.Router();

// =====================================================
// SIGNUP
// =====================================================

router.post("/signup", signupUser);

// =====================================================
// LOGIN
// =====================================================

router.post("/login", loginUser);

// =====================================================
// CURRENT LOGGED-IN USER
// =====================================================

router.get("/me", protect, getCurrentUser);

// =====================================================
// GET FAVOURITES
// =====================================================

router.get("/favourites", protect, getFavorites);

// =====================================================
// TOGGLE FAVOURITE
// =====================================================

// =====================================================
// ALTERNATIVE FAVORITE ENDPOINT
// =====================================================


// =====================================================
// CREATE BOOKING
// =====================================================


// =====================================================
// GET USER BOOKINGS
// =====================================================

router.get(
  "/bookings",
  protect,
  getMyBookings
);

export default router;