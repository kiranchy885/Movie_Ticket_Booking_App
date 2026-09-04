import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./configs/db.js";

import userRouter from "./routes/userRoutes.js";
import movieRouter from "./routes/movieRoutes.js";
import showRouter from "./routes/showRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import adminRouter from "./routes/adminRoutes.js";

dotenv.config();

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// =====================================================
// DATABASE
// =====================================================

connectDB();

// =====================================================
// TEST ROUTE
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Movie Ticket Booking API is running",
  });
});

// =====================================================
// API ROUTES
// =====================================================

app.use("/admin", adminRouter);

// USER ROUTES
app.use("/api/user", userRouter);

// MOVIE ROUTES
app.use("/api/movie", movieRouter);

// SHOW ROUTES
app.use("/api/show", showRouter);

// BOOKING ROUTES
app.use("/api/booking", bookingRouter);

// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// =====================================================
// SERVER
// =====================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Server URL: http://localhost:${PORT}`);
});