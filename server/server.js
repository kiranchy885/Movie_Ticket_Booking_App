import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import movieRoutes from "./routes/movieRoutes.js";
import recommendationRouter from "./routes/recommendationRoutes.js";
import userRouter from "./routes/userRoutes.js";
import showRouter from "./routes/showRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import analyticsRouter from "./routes/analyticsRoutes.js";
import theaterRouter from "./routes/theaterRoutes.js";

import { startReminderScheduler } from "./services/reminderService.js";
import connectDB from "./configs/db.js";
import { seedTheaters } from "./controllers/theaterController.js";
import { sendEmail } from "./utils/sendEmail.js";

dotenv.config();

const app = express(); // Initialized once here

// CORS
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

// JSON PARSER (Must be before defining routes)
app.use(express.json());

// NEWSLETTER SUBSCRIBE ROUTE
app.post('/api/subscribe', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required." });
        }

        const subject = "Welcome to QuickShow! 🎉 Subscription Confirmed";
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eaeaea; border-radius: 10px; background-color: #f9f9f9;">
                <h2 style="color: #e50914; margin-top: 0;">Welcome to QuickShow!</h2>
                <p>Thank you for subscribing to our newsletter. You're now on our VIP list to receive exclusive movie trailers, premier showtimes, and special promo codes right in your inbox.</p>
                <div style="background: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #111;">Need Booking Consultations?</p>
                    <p style="margin: 0 0 5px 0;">📧 Email: <a href="mailto:deeptiparajuli4@gmail.com" style="color: #e50914;">deeptiparajuli4@gmail.com</a></p>
                    <p style="margin: 0;">📞 Mobile No: <strong>9841368745</strong> (Faster contact)</p>
                </div>
                <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
                <p style="font-size: 12px; color: #777; margin-bottom: 0;">Happy watching!<br/><strong>The QuickShow Team</strong></p>
            </div>
        `;

        await sendEmail(email, subject, htmlContent);

        return res.status(200).json({ 
            success: true, 
            message: "Thank-you email sent successfully!" 
        });
    } catch (error) {
        console.error("Subscription error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Failed to send subscription email." 
        });
    }
});

// HTTP SERVER
const server = http.createServer(app);

// SOCKET.IO
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true,
    },
});

// Make Socket.IO available to controllers
app.set("io", io);

// SOCKET CONNECTION
io.on("connection", (socket) => {
    console.log("📡 Analytics socket connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("📡 Analytics socket disconnected:", socket.id);
    });
});

// DATABASE CONNECTION
connectDB()
    .then(async () => {
        console.log("MongoDB connected successfully");

        //Seed sample theaters if collection is empty 
        try {
            await seedTheaters();
        } catch (error) {
            console.error("Theater seeding failed:", error.message);
        }

        // Start daily reminder scheduler 
        try {
            startReminderScheduler();
            console.log("Daily reminder scheduler started");
        } catch (error) {
            console.error("Reminder scheduler failed:", error.message);
        }
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    });

// ROUTES

// USER ROUTES 
app.use("/user", userRouter);

//  SHOW ROUTES
app.use("/show", showRouter);

//  BOOKING ROUTES
app.use("/booking", bookingRouter);

// ADMIN ROUTES 
app.use("/admin", adminRouter);

//  THEATER ROUTES 
app.use("/theater", theaterRouter);

//  MOVIE ROUTES 
app.use("/", movieRoutes);

// RECOMMENDATION ROUTES

app.use("/recommendations", recommendationRouter);

// ANALYTICS ROUTES 
app.use("/api/analytics", analyticsRouter);

// ROOT ROUTE
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "QuickShow server is running",
    });
});

// 404 HANDLER
app.use((req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

// ERROR HANDLER
app.use((err, req, res, next) => {
    console.error("Server error:", err);
    res.status(500).json({
        success: false,
        message: "Internal server error.",
    });
});

// SERVER START
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
    console.log(`Server URL: http://localhost:${PORT}`);
    console.log("Socket.IO ready");
});