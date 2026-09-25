import express from "express";

import {
  login,
  signup,
  verifyOtpAndSetPassword,
  resendVerificationOtp,
  sendResetOtp,
  resetPasswordWithOtp,
  googleAuth,
  getCurrentUser,
  toggleFavourite,
  createBooking,
  getMyBookings,
  updateUser,
  getHomeRecommendations,
} from "../controllers/userController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

// ----- AUTH ROUTES -----

router.post("/signup", signup);

router.post("/login", login);

router.post("/verify-otp", verifyOtpAndSetPassword);

router.post("/resend-otp", resendVerificationOtp);

router.post("/send-reset-otp", sendResetOtp);

router.post("/reset-password-otp", resetPasswordWithOtp);

router.post("/google-auth", googleAuth);

// ----- PROTECTED USER ROUTES -----

router.get("/me", protect, getCurrentUser);

router.put("/update", protect, updateUser);

router.post("/favourite/:movieId", protect, toggleFavourite);

router.post("/booking", protect, createBooking);

router.get("/bookings", protect, getMyBookings);

// =====================================================
// MOVIE RECOMMENDATION ROUTE
// -----------------------------------------------------
// Collaborative filtering using:
// - User ratings
// - Cosine similarity
// - Similarity threshold
// - Active/future shows only
//
// Example:
// GET /user/recommendations/USER_ID
// =====================================================

router.get(
  "/recommendations/:userId",
  getHomeRecommendations
);

export default router;