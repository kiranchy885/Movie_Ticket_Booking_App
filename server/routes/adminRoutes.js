import express from "express";
import { protect, protectAdmin } from "../middleWare/auth.js";
import { getAllBookings, getDashboardData, isAdmin } from "../controllers/adminController.js";
import { getAllShows } from "../controllers/showController.js";
import { adminLogin } from "../controllers/AdminControllers.js";


const adminRouter = express.Router();

// Admin login
adminRouter.post("/login", adminLogin);

adminRouter.get('/is-admin', protectAdmin, isAdmin)
adminRouter.get('/dashboard', protectAdmin, getDashboardData)
adminRouter.get('/all-shows', protectAdmin, getAllShows)
adminRouter.get('/all-bookings', protectAdmin, getAllBookings)

export default adminRouter;