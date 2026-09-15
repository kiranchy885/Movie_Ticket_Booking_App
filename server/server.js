import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import movieRoutes from "./routes/movieRoutes.js";
import userRouter from "./routes/userRoutes.js";
import showRouter from "./routes/showRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import analyticsRouter from "./routes/analyticsRoutes.js";
import theaterRouter from "./routes/theaterRoutes.js";
import recommendationRouter from "./routes/recommendationRoutes.js";

import connectDB from "./configs/db.js";

import { seedTheaters } from "./controllers/theaterController.js";

// Reminder scheduler — IMPORT ONLY ONCE
import { startReminderScheduler } from "./services/reminderService.js";

dotenv.config();

const app = express();

// =====================================================
// CORS
// =====================================================

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

// =====================================================
// JSON
// =====================================================

app.use(express.json());

// =====================================================
// HTTP SERVER
// =====================================================

const server = http.createServer(app);

// =====================================================
// SOCKET.IO
// =====================================================

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true,
    },
});

// Make Socket.IO available to controllers
app.set("io", io);

// =====================================================
// SOCKET CONNECTION
// =====================================================

io.on("connection", (socket) => {
    console.log(
        "📡 Analytics socket connected:",
        socket.id
    );

    socket.on("disconnect", () => {
        console.log(
            "📡 Analytics socket disconnected:",
            socket.id
        );
    });
});

// =====================================================
// DATABASE CONNECTION
// =====================================================

connectDB()
    .then(async () => {
        console.log(
            "MongoDB connected successfully"
        );

        // -------------------------------------------------
        // Seed theaters
        // -------------------------------------------------

        try {
            await seedTheaters();

            console.log(
                "🎬 Theater seed check completed"
            );
        } catch (error) {
            console.error(
                "❌ Theater seed error:",
                error.message
            );
        }

        // -------------------------------------------------
        // Start reminder scheduler
        // -------------------------------------------------

        try {
            startReminderScheduler();

            console.log(
                "⏰ Reminder scheduler started successfully"
            );
        } catch (error) {
            console.error(
                "❌ Reminder scheduler error:",
                error.message
            );
        }
    })
    .catch((error) => {
        console.error(
            "MongoDB connection failed:",
            error.message
        );

        process.exit(1);
    });

// =====================================================
// ROUTES
// =====================================================

// User routes
app.use("/user", userRouter);

// Show routes
app.use("/show", showRouter);

// Booking routes
app.use("/booking", bookingRouter);

// Admin routes
app.use("/admin", adminRouter);

// Theater routes
app.use("/theater", theaterRouter);

// Movie routes
app.use("/", movieRoutes);

// Analytics routes
app.use(
    "/api/analytics",
    analyticsRouter
);

// Recommendation routes
// Frontend should call:
// http://localhost:5000/api/recommendations
app.use(
    "/api/recommendations",
    recommendationRouter
);

// =====================================================
// ROOT
// =====================================================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "QuickShow server is running",
    });
});

// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {
    console.log(
        `404 - Route not found: ${req.method} ${req.originalUrl}`
    );

    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use(
    (err, req, res, next) => {
        console.error(
            "Server error:",
            err
        );

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
);

// =====================================================
// SERVER START
// =====================================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(
        `Server started on port ${PORT}`
    );

    console.log(
        `Server URL: http://localhost:${PORT}`
    );

    console.log(
        "Socket.IO ready"
    );
});