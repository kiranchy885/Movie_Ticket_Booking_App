import express from "express";
import { protect, protectAdmin } from "../middleware/auth.js";
import {
    adminLogin,
    adminRegister,
    adminRegisterRequest,    // NEW
    adminVerifyOtp,          // NEW
    adminResendOtp,          // NEW
    getAllBookings,
    getDashboardData,
    isAdmin,
    getAdminProfile,
    updateAdminProfile,
    changeAdminPassword,
} from "../controllers/adminController.js";
import { getAllShows } from "../controllers/showController.js";
import User from "../models/User.js";    // Regular users model
import Admin from "../models/admin.js";  // Admins model

const adminRouter = express.Router();

// =====================================================
// 1. PUBLIC ROUTES (No token required)
// =====================================================

// Existing login & register (kept for compatibility)
adminRouter.post("/login", adminLogin);
adminRouter.post("/register", adminRegister);

// NEW OTP-based registration endpoints (public)
adminRouter.post("/register-request", adminRegisterRequest);   // sends OTP
adminRouter.post("/verify-otp", adminVerifyOtp);               // verify OTP & set password
adminRouter.post("/resend-otp", adminResendOtp);               // resend OTP

// =====================================================
// 2. PROTECTED ROUTES (Token + Admin role required)
// =====================================================

adminRouter.use(protect);
adminRouter.use(protectAdmin);

adminRouter.get("/is-admin", isAdmin);
adminRouter.get("/dashboard", getDashboardData);
adminRouter.get("/all-shows", getAllShows);
adminRouter.get("/all-bookings", getAllBookings);

// 3. ADMIN PROFILE ROUTES
adminRouter.get("/profile", getAdminProfile);
adminRouter.put("/profile", updateAdminProfile);
adminRouter.put("/change-password", changeAdminPassword);

// ==========================================
// 4. USER & ADMIN MANAGEMENT ROUTES
// ==========================================

// Get all regular users
adminRouter.get("/users", async (req, res) => {
    try {
        const users = await User.find({}).select("-password");
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all admins
adminRouter.get("/all", async (req, res) => {
    try {
        const admins = await Admin.find({}).select("-password");
        res.json({ success: true, admins });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ADD NEW ADMIN ENDPOINT (Fixes the POST /admin/add route error)
adminRouter.post("/add", adminRegister);

// Delete a regular user
adminRouter.delete("/user/:id", async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete an admin
adminRouter.delete("/admin/:id", async (req, res) => {
    try {
        await Admin.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Admin deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default adminRouter;