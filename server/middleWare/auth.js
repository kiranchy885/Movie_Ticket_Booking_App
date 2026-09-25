import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Admin from "../models/admin.js";

export const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided.",
            });
        }

        const token = authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : null;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. Invalid authorization format.",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from the appropriate collection based on role
        let user = null;
        if (decoded.role === "admin") {
            user = await Admin.findById(decoded.id).select("-password");
        } else {
            // default to regular user
            user = await User.findById(decoded.id).select("-password");
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found. Invalid token.",
            });
        }

        req.user = user; // attach the full user document (without password)
        req.user.role = user.role || "user"; // ensure role is set

        // =====================================================
        // NEW: Attach userId shortcut
        // Controllers like rateMovie use req.userId directly,
        // so we set it here for convenience.
        // =====================================================
        req.userId = user._id;

        console.log("Authenticated user:", req.user);

        next();
    } catch (error) {
        console.error("Authentication error:", error.message);
        return res.status(401).json({
            success: false,
            message: "Invalid token or token expired.",
        });
    }
};

export const protectAdmin = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required.",
            });
        }
        next();
    } catch (error) {
        console.error("Admin authentication error:", error.message);
        return res.status(403).json({
            success: false,
            message: "Admin authentication failed.",
        });
    }
};