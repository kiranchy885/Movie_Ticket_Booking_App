import Admin from "../models/admin.js";
import Show from "../models/Show.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/sendEmail.js";

// HELPERS
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const generateRandomPassword = (length = 12) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

//Gmail format validation (must end with @gmail.com)
const isValidGmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    return re.test(email);
};

// ADMIN LOGIN (with Gmail validation + clear existence)
export const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide both email and password.",
            });
        }

        const trimmedEmail = email.trim().toLowerCase();

        //Validate Gmail format
        if (!isValidGmail(trimmedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format. Only Gmail addresses are allowed (e.g., admin@gmail.com).",
            });
        }

        const admin = await Admin.findOne({ email: trimmedEmail });
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "No admin account found with this email.",
            });
        }

        // Check if admin is verified
        if (!admin.verified) {
            return res.status(401).json({
                success: false,
                message: "Please verify your email first. Check your inbox for the OTP.",
            });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Incorrect password.",
            });
        }

        const token = jwt.sign(
            { id: admin._id, role: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            success: true,
            token,
            admin: {
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role || "admin",
            },
        });
    } catch (error) {
        console.error("Admin login error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during admin login.",
        });
    }
};

// ADMIN REGISTER (direct, kept for compatibility)
export const adminRegister = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required.",
            });
        }

        const trimmedEmail = email.trim().toLowerCase();

        //Validate Gmail format
        if (!isValidGmail(trimmedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format. Only Gmail addresses are allowed (e.g., admin@gmail.com).",
            });
        }

        const existingAdmin = await Admin.findOne({ email: trimmedEmail });
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: "Admin with this email already exists.",
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newAdmin = await Admin.create({
            name: name.trim(),
            email: trimmedEmail,
            password: hashedPassword,
            role: "admin",
            verified: true, // directly verified because they set password immediately
        });

        const token = jwt.sign(
            { id: newAdmin._id, role: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(201).json({
            success: true,
            token,
            admin: {
                _id: newAdmin._id,
                name: newAdmin.name,
                email: newAdmin.email,
                role: newAdmin.role,
            },
        });
    } catch (error) {
        console.error("Admin register error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during admin registration.",
        });
    }
};

// ADMIN REGISTER – REQUEST OTP (with Gmail validation)
export const adminRegisterRequest = async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: "Name and email are required.",
            });
        }

        const trimmedEmail = email.trim().toLowerCase();

        // Validate Gmail format
        if (!isValidGmail(trimmedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format. Only Gmail addresses are allowed (e.g., admin@gmail.com).",
            });
        }

        // Check if admin already exists and is verified
        const existingAdmin = await Admin.findOne({ email: trimmedEmail });
        if (existingAdmin && existingAdmin.verified) {
            return res.status(400).json({
                success: false,
                message: "Admin with this email already exists and is verified.",
            });
        }

        // Generate OTP
        const otp = generateOtp();
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Generate a temporary password to satisfy the required field
        const tempPassword = generateRandomPassword();
        const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

        // Upsert: create if not exists, or update if exists but not verified
        const admin = await Admin.findOneAndUpdate(
            { email: trimmedEmail },
            {
                $set: {
                    name: name.trim(),
                    email: trimmedEmail,
                    password: hashedTempPassword, // temporary
                    otp,
                    otpExpires,
                    verified: false,
                    role: "admin",
                },
            },
            { upsert: true, returnDocument: 'after' } // ✅ Fixed deprecation warning here
        );

        console.log(` OTP for admin ${trimmedEmail}: ${otp}`); // Debug

        // Send OTP email
        const subject = "Admin Registration OTP – QuickShow";
        const html = `
            <h2>Hello ${name},</h2>
            <p>Your admin registration OTP is: <strong>${otp}</strong></p>
            <p>This code expires in 15 minutes.</p>
            <p>If you didn't request this, ignore this email.</p>
            <p>Thank you,<br/>QuickShow Team</p>
        `;
        await sendEmail(trimmedEmail, subject, html);

        return res.status(200).json({
            success: true,
            message: "OTP sent to your email. Please verify to set your password.",
        });
    } catch (error) {
        console.error("Admin register request error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during admin registration request.",
        });
    }
};

// ADMIN VERIFY OTP (unchanged)
export const adminVerifyOtp = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Email, OTP, and new password are required.",
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters.",
            });
        }

        const trimmedEmail = email.trim().toLowerCase();

        const admin = await Admin.findOne({
            email: trimmedEmail,
            otp: otp,
            otpExpires: { $gt: new Date() },
        });

        console.log(`🔍 Admin found? ${!!admin}`); // Debug

        if (!admin) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP.",
            });
        }

        // Hash the new password and update
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        admin.password = hashedPassword;
        admin.verified = true;
        admin.otp = null;
        admin.otpExpires = null;
        await admin.save();

        return res.status(200).json({
            success: true,
            message: "Admin account verified and password set. You can now log in.",
        });
    } catch (error) {
        console.error("Admin verify OTP error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during OTP verification.",
        });
    }
};

// ADMIN RESEND OTP (with Gmail validation)
export const adminResendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required.",
            });
        }

        const trimmedEmail = email.trim().toLowerCase();

        //Validate Gmail format
        if (!isValidGmail(trimmedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format. Only Gmail addresses are allowed.",
            });
        }

        const admin = await Admin.findOne({ email: trimmedEmail });
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found.",
            });
        }

        if (admin.verified) {
            return res.status(400).json({
                success: false,
                message: "Admin already verified.",
            });
        }

        // Generate new OTP
        const otp = generateOtp();
        admin.otp = otp;
        admin.otpExpires = new Date(Date.now() + 15 * 60 * 1000);
        await admin.save();

        console.log(`🔄 New OTP for ${trimmedEmail}: ${otp}`); // Debug

        // Send OTP email
        const subject = "Resend Admin Registration OTP – QuickShow";
        const html = `
            <h2>Hello ${admin.name},</h2>
            <p>Your new admin registration OTP is: <strong>${otp}</strong></p>
            <p>This code expires in 15 minutes.</p>
            <p>If you didn't request this, ignore this email.</p>
            <p>Thank you,<br/>QuickShow Team</p>
        `;
        await sendEmail(trimmedEmail, subject, html);

        return res.status(200).json({
            success: true,
            message: "OTP resent to your email.",
        });
    } catch (error) {
        console.error("Admin resend OTP error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during OTP resend.",
        });
    }
};

// CHECK IF ADMIN (unchanged)
export const isAdmin = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            isAdmin: req.user.role === "admin",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error verifying admin status.",
        });
    }
};

// GET DASHBOARD DATA (unchanged)
export const getDashboardData = async (req, res) => {
    try {
        const totalUser = await User.countDocuments();
        const totalAdmin = await Admin.countDocuments();
        const paidBookings = await Booking.find({ isPaid: true });

        const totalBookings = paidBookings.length;
        const totalRevenue = paidBookings.reduce((sum, booking) => {
            const amount = booking.totalAmount || booking.amount || 0;
            return sum + amount;
        }, 0);

        return res.status(200).json({
            success: true,
            dashboardData: {
                totalBookings,
                totalRevenue,
                totalUser,
                totalAdmin,
            },
        });
    } catch (error) {
        console.error("Dashboard data error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard data.",
        });
    }
};

// GET ALL BOOKINGS (unchanged)
export const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate("user", "name email")
            .populate("show")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            bookings,
        });
    } catch (error) {
        console.error("Get all bookings error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch bookings.",
        });
    }
};

// GET ADMIN PROFILE (unchanged)
export const getAdminProfile = async (req, res) => {
    try {
        const adminId = req.user.id;

        const admin = await Admin.findById(adminId).select("-password");
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found.",
            });
        }

        return res.status(200).json({
            success: true,
            admin,
        });
    } catch (error) {
        console.error("Get admin profile error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch admin profile.",
        });
    }
};


// UPDATE ADMIN PROFILE (with Gmail validation on email)
export const updateAdminProfile = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { name, email, image, currentPassword, newPassword } = req.body;

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found.",
            });
        }

        // 1. Update Name and Image if provided
        if (name !== undefined) admin.name = name.trim();
        if (image !== undefined) admin.image = image;

        // 2. Update Email if provided (with validation and uniqueness check)
        if (email !== undefined) {
            const trimmedEmail = email.trim().toLowerCase();

            // Validate Gmail format
            if (!isValidGmail(trimmedEmail)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid email format. Only Gmail addresses are allowed (e.g., admin@gmail.com).",
                });
            }

            const existingAdmin = await Admin.findOne({
                email: trimmedEmail,
                _id: { $ne: adminId },
            });
            if (existingAdmin) {
                return res.status(400).json({
                    success: false,
                    message: "Email already in use by another admin.",
                });
            }
            admin.email = trimmedEmail;
        }

        // 3. Update Password if both current and new passwords are provided
        if (currentPassword && newPassword) {
            const isMatch = await bcrypt.compare(currentPassword, admin.password);
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: "Current password is incorrect.",
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "New password must be at least 6 characters.",
                });
            }

            const salt = await bcrypt.genSalt(10);
            admin.password = await bcrypt.hash(newPassword, salt);
        }

        await admin.save();

        // Return updated admin document without the password field
        const updatedAdmin = await Admin.findById(adminId).select("-password");

        return res.status(200).json({
            success: true,
            admin: updatedAdmin,
            message: "Profile updated successfully.",
        });
    } catch (error) {
        console.error("Update admin profile error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update admin profile.",
        });
    }
};

// CHANGE ADMIN PASSWORD (unchanged)
export const changeAdminPassword = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Please provide current and new password.",
            });
        }

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found.",
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect.",
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        admin.password = hashedPassword;
        await admin.save();

        return res.status(200).json({
            success: true,
            message: "Password changed successfully.",
        });
    } catch (error) {
        console.error("Change admin password error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to change password.",
        });
    }
};