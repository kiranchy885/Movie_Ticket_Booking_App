import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
        },
        image: {
            type: String,
            default: "",
        },
        role: {
            type: String,
            default: "admin",
        },

        // ----- NEW OTP FIELDS (for admin registration) -----
        verified: {
            type: Boolean,
            default: false,
        },
        otp: {
            type: String,
            default: null,
        },
        otpExpires: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;