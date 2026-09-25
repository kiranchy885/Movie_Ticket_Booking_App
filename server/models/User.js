import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    image: { type: String, default: "" },
    role: { type: String, default: "user", enum: ["user"] },
    favourites: { type: [String], default: [] },
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],

    // --- Signup verification OTP ---
    verified: { type: Boolean, default: false },
    verificationOtp: { type: String, default: null },
    verificationOtpExpires: { type: Date, default: null },

    // --- Password reset OTP ---
    resetOtp: { type: String, default: null },
    resetOtpExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;