import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ==========================================
// REGISTER USER
// ==========================================

export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        console.log("=================================");
        console.log("Signup request received");
        console.log("Name:", name);
        console.log("Email:", email);
        console.log("=================================");

        // Check required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide name, email and password",
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.toLowerCase().trim();

        // Check name
        if (cleanName.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Name must contain at least 2 characters",
            });
        }

        // Check email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address",
            });
        }

        // Check password
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 6 characters",
            });
        }

        // Check existing user
        const existingUser = await User.findOne({
            email: cleanEmail,
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // IMPORTANT:
        // Public signup ALWAYS creates a normal user
        const user = await User.create({
            name: cleanName,
            email: cleanEmail,
            password: hashedPassword,
            role: "user",
        });

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: "JWT secret is not configured",
            });
        }

        // Create token
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        console.log("User registered:", user.email);

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

    } catch (error) {
        console.error("Register error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// ==========================================
// LOGIN USER / ADMIN
// ==========================================

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const cleanEmail = email.toLowerCase().trim();

        // Find user
        const user = await User.findOne({
            email: cleanEmail,
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Check password
        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: "JWT secret is not configured",
            });
        }

        // Create token using role
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        console.log("Login successful");
        console.log("Email:", user.email);
        console.log("Role:", user.role);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};