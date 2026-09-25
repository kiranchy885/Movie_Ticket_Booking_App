import User from "../models/User.js";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { sendEmail } from "../utils/sendEmail.js";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

// =====================================================
// HELPERS
// =====================================================

const generateOtp = () =>
  Math.floor(
    100000 + Math.random() * 900000
  ).toString();

const generateRandomPassword = (
  length = 10
) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";

  let password = "";

  for (let i = 0; i < length; i++) {
    password += chars.charAt(
      Math.floor(
        Math.random() * chars.length
      )
    );
  }

  return password;
};

// ✅ Gmail format validation
const isValidGmail = (email) => {
  const re =
    /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  return re.test(email);
};

// =====================================================
// REAL-TIME USER SYNC EVENT
// -----------------------------------------------------
// Emitted whenever a user's data changes
// (favourites, bookings, profile).
// =====================================================

const emitUserUpdated = (
  req,
  userId,
  reason,
  extra = {}
) => {
  try {
    const io = req.app.get("io");

    if (!io) return;

    io.emit("userUpdated", {
      userId: String(userId),
      reason,

      // "favourite_toggled"
      // "favourite_cleanup"
      // "booking_added"
      // "profile_updated"

      timestamp:
        new Date().toISOString(),

      ...extra,
    });

    console.log(
      `📡 userUpdated → ${userId} (${reason})`
    );
  } catch (error) {
    console.error(
      "userUpdated socket error:",
      error.message
    );
  }
};

// =====================================================
// CLEAN EXPIRED / INACTIVE FAVOURITES
// =====================================================
//
// User.favourites is the database source of truth.
//
// A favorite remains in the Users collection only when
// the corresponding movie has at least one show whose:
//
// showDateTime >= current date/time
//
// Therefore:
//
// Active/future show  → KEEP favourite
// Expired shows only  → REMOVE favourite
// No show             → REMOVE favourite
//
// This function updates the Users collection directly.
// =====================================================

const cleanupExpiredUserFavourites =
  async (user, req = null) => {
    try {
      if (!user) {
        return {
          changed: false,
          removedMovieIds: [],
          favourites: [],
        };
      }

      if (
        !Array.isArray(
          user.favourites
        ) ||
        user.favourites.length === 0
      ) {
        return {
          changed: false,
          removedMovieIds: [],
          favourites: [],
        };
      }

      // -------------------------------------------------
      // CURRENT DATE/TIME
      // -------------------------------------------------

      const now = new Date();

      // -------------------------------------------------
      // GET ACTIVE / FUTURE SHOWS
      // -------------------------------------------------

      const activeShows =
        await Show.find({
          showDateTime: {
            $gte: now,
          },
        })
          .select(
            "movie showDateTime"
          )
          .lean();

      // -------------------------------------------------
      // MOVIES THAT STILL HAVE ACTIVE/FUTURE SHOWS
      // -------------------------------------------------

      const activeMovieIds =
        new Set();

      activeShows.forEach(
        (show) => {
          if (!show?.movie) {
            return;
          }

          const movieId =
            typeof show.movie ===
            "object"
              ? show.movie._id
              : show.movie;

          if (
            movieId !== undefined &&
            movieId !== null
          ) {
            activeMovieIds.add(
              String(movieId)
            );
          }
        }
      );

      // -------------------------------------------------
      // ORIGINAL FAVORITES
      // -------------------------------------------------

      const originalFavouriteIds =
        user.favourites.map(
          (movieId) =>
            String(
              typeof movieId ===
                "object"
                ? movieId._id
                : movieId
            )
        );

      // -------------------------------------------------
      // KEEP ONLY FAVORITES WITH
      // ACTIVE/FUTURE SHOWS
      // -------------------------------------------------

      const validFavouriteIds =
        originalFavouriteIds.filter(
          (movieId) =>
            activeMovieIds.has(
              movieId
            )
        );

      // -------------------------------------------------
      // IDENTIFY REMOVED FAVORITES
      // -------------------------------------------------

      const removedMovieIds =
        originalFavouriteIds.filter(
          (movieId) =>
            !activeMovieIds.has(
              movieId
            )
        );

      // -------------------------------------------------
      // REMOVE DUPLICATES WHILE PRESERVING ORDER
      // -------------------------------------------------

      const uniqueValidFavouriteIds =
        [
          ...new Set(
            validFavouriteIds
          ),
        ];

      // -------------------------------------------------
      // UPDATE USER DOCUMENT
      // -------------------------------------------------

      if (
        removedMovieIds.length > 0 ||
        uniqueValidFavouriteIds.length !==
          originalFavouriteIds.length
      ) {
        user.favourites =
          uniqueValidFavouriteIds;

        await user.save();

        console.log(
          `🧹 Favourite cleanup for user ${user._id}`
        );

        console.log(
          "Removed movie IDs:",
          removedMovieIds
        );

        console.log(
          "Remaining favourites:",
          uniqueValidFavouriteIds
        );

        // -------------------------------------------------
        // REAL-TIME UPDATE
        // -------------------------------------------------

        if (req) {
          emitUserUpdated(
            req,
            user._id,
            "favourite_cleanup",
            {
              favourites:
                uniqueValidFavouriteIds,
              removedMovieIds,
            }
          );
        }

        return {
          changed: true,
          removedMovieIds,
          favourites:
            uniqueValidFavouriteIds,
        };
      }

      return {
        changed: false,
        removedMovieIds: [],
        favourites:
          uniqueValidFavouriteIds,
      };
    } catch (error) {
      console.error(
        "Favourite cleanup error:",
        error
      );

      // Do not break /user/me if cleanup itself fails.
      return {
        changed: false,
        removedMovieIds: [],
        favourites: Array.isArray(
          user?.favourites
        )
          ? user.favourites.map(
              (id) =>
                String(
                  typeof id ===
                    "object"
                    ? id._id
                    : id
                )
            )
          : [],
      };
    }
  };

// =====================================================
// AUTH – SIGNUP (OTP) – with Gmail check
// =====================================================

export const signup = async (
  req,
  res
) => {
  try {
    const {
      name,
      email,
      mobile,
    } = req.body;

    if (
      !name ||
      !email ||
      !mobile
    ) {
      return res.status(400).json({
        message:
          "All fields are required.",
      });
    }

    const trimmedEmail =
      email.trim().toLowerCase();

    // Validate Gmail
    if (
      !isValidGmail(
        trimmedEmail
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid email format. Only Gmail addresses are allowed (e.g., user@gmail.com).",
      });
    }

    const existing =
      await User.findOne({
        email: trimmedEmail,
      });

    if (existing) {
      return res.status(400).json({
        message:
          "Email is already registered.",
      });
    }

    const tempPassword =
      generateRandomPassword();

    const hashedPassword =
      await bcrypt.hash(
        tempPassword,
        10
      );

    const otp =
      generateOtp();

    const otpExpires =
      Date.now() +
      15 * 60 * 1000;

    const user = new User({
      name,
      email:
        trimmedEmail,
      mobile,
      password:
        hashedPassword,
      verified: false,
      verificationOtp:
        otp,
      verificationOtpExpires:
        otpExpires,
    });

    await user.save();

    await sendEmail(
      trimmedEmail,
      "Verify your email – QuickShow",
      `
        <h2>Hello ${name},</h2>
        <p>Thank you for signing up. Please use the code below to verify your email and set your password:</p>
        <h1 style="background: #f0f0f0; padding: 16px; text-align: center; font-size: 32px; letter-spacing: 4px;">${otp}</h1>
        <p>This code expires in 15 minutes.</p>
        <p>If you didn't request this, ignore this email.</p>
        <p>Thank you,<br/>QuickShow Team</p>
      `
    );

    res.status(201).json({
      success: true,
      message:
        "OTP sent to your email. Please verify to set your password.",
    });
  } catch (error) {
    console.error(
      "Signup error:",
      error
    );

    res.status(500).json({
      message:
        "Server error",
    });
  }
};

// =====================================================
// VERIFY OTP AND SET PASSWORD
// =====================================================

export const verifyOtpAndSetPassword =
  async (req, res) => {
    try {
      const {
        email,
        otp,
        newPassword,
      } = req.body;

      if (
        !email ||
        !otp ||
        !newPassword
      ) {
        return res.status(400).json({
          message:
            "Email, OTP, and password are required.",
        });
      }

      if (
        newPassword.length < 6
      ) {
        return res.status(400).json({
          message:
            "Password must be at least 6 characters.",
        });
      }

      const user =
        await User.findOne({
          email:
            email
              .toLowerCase()
              .trim(),
          verificationOtp:
            otp,
          verificationOtpExpires:
            {
              $gt: Date.now(),
            },
        });

      if (!user) {
        return res.status(400).json({
          message:
            "Invalid or expired OTP.",
        });
      }

      const hashed =
        await bcrypt.hash(
          newPassword,
          10
        );

      user.password =
        hashed;

      user.verified =
        true;

      user.verificationOtp =
        null;

      user.verificationOtpExpires =
        null;

      await user.save();

      res.status(200).json({
        success: true,
        message:
          "Email verified and password set. You can now log in.",
      });
    } catch (error) {
      console.error(
        "OTP verification error:",
        error
      );

      res.status(500).json({
        message:
          "Server error",
      });
    }
  };

// =====================================================
// RESEND VERIFICATION OTP
// =====================================================

export const resendVerificationOtp =
  async (req, res) => {
    try {
      const { email } =
        req.body;

      const user =
        await User.findOne({
          email:
            email
              .toLowerCase()
              .trim(),
        });

      if (!user) {
        return res.status(404).json({
          message:
            "User not found.",
        });
      }

      if (user.verified) {
        return res.status(400).json({
          message:
            "Already verified.",
        });
      }

      const otp =
        generateOtp();

      user.verificationOtp =
        otp;

      user.verificationOtpExpires =
        Date.now() +
        15 * 60 * 1000;

      await user.save();

      await sendEmail(
        email,
        "Resend OTP – QuickShow",
        `Your new OTP is: ${otp}`
      );

      res.json({
        success: true,
        message:
          "OTP resent.",
      });
    } catch (error) {
      console.error(
        error
      );

      res.status(500).json({
        message:
          "Server error.",
      });
    }
  };

// =====================================================
// LOGIN
// =====================================================

export const login = async (
  req,
  res
) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (
      !email ||
      !password
    ) {
      return res.status(400).json({
        message:
          "Please enter email and password.",
      });
    }

    const cleanEmail =
      email.trim().toLowerCase();

    if (
      !isValidGmail(
        cleanEmail
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid email format. Only Gmail addresses are allowed (e.g., user@gmail.com).",
      });
    }

    const user =
      await User.findOne({
        email: cleanEmail,
      });

    if (!user) {
      return res.status(404).json({
        message:
          "No account found with this email.",
      });
    }

    if (
      user.role ===
      "admin"
    ) {
      return res.status(403).json({
        message:
          "Admin accounts must log in via the admin portal.",
      });
    }

    if (!user.verified) {
      return res.status(401).json({
        message:
          "Please verify your email before signing in. Check your inbox for the verification OTP.",
      });
    }

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        message:
          "Invalid email or password.",
      });
    }

    const token =
      jwt.sign(
        {
          id: user._id,
          role: "user",
        },
        process.env.JWT_SECRET,
        {
          expiresIn:
            "7d",
        }
      );

    res.status(200).json({
      success: true,
      token,

      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: "user",
        favourites:
          user.favourites ||
          [],
        bookings:
          user.bookings ||
          [],
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    res.status(500).json({
      message:
        "Server error during login.",
    });
  }
};

// =====================================================
// SEND RESET OTP
// =====================================================

export const sendResetOtp =
  async (req, res) => {
    try {
      const { email } =
        req.body;

      if (!email) {
        return res.status(400).json({
          message:
            "Email is required.",
        });
      }

      const cleanEmail =
        email.trim().toLowerCase();

      if (
        !isValidGmail(
          cleanEmail
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid email format. Only Gmail addresses are allowed.",
        });
      }

      const user =
        await User.findOne({
          email: cleanEmail,
        });

      if (!user) {
        return res.status(404).json({
          message:
            "No account found with this email.",
        });
      }

      const otp =
        generateOtp();

      user.resetOtp =
        otp;

      user.resetOtpExpires =
        Date.now() +
        15 * 60 * 1000;

      await user.save();

      const subject =
        "Password Reset OTP – QuickShow";

      const html = `
        <h2>Hello ${user.name},</h2>
        <p>Your password reset OTP is: <strong>${otp}</strong></p>
        <p>This code expires in 15 minutes.</p>
        <p>If you didn't request this, ignore this email.</p>
      `;

      await sendEmail(
        cleanEmail,
        subject,
        html
      );

      res.status(200).json({
        success: true,
        message:
          "Reset OTP sent to your email.",
      });
    } catch (error) {
      console.error(
        "Send reset OTP error:",
        error
      );

      res.status(500).json({
        message:
          "Server error",
      });
    }
  };

// =====================================================
// RESET PASSWORD WITH OTP
// =====================================================

export const resetPasswordWithOtp =
  async (req, res) => {
    try {
      const {
        email,
        otp,
        newPassword,
      } = req.body;

      if (
        !email ||
        !otp ||
        !newPassword
      ) {
        return res.status(400).json({
          message:
            "Email, OTP, and new password are required.",
        });
      }

      if (
        newPassword.length < 6
      ) {
        return res.status(400).json({
          message:
            "Password must be at least 6 characters.",
        });
      }

      const cleanEmail =
        email.trim().toLowerCase();

      const user =
        await User.findOne({
          email: cleanEmail,
          resetOtp: otp,
          resetOtpExpires: {
            $gt: Date.now(),
          },
        });

      if (!user) {
        return res.status(400).json({
          message:
            "Invalid or expired OTP.",
        });
      }

      const hashed =
        await bcrypt.hash(
          newPassword,
          10
        );

      user.password =
        hashed;

      user.resetOtp =
        null;

      user.resetOtpExpires =
        null;

      await user.save();

      res.status(200).json({
        success: true,
        message:
          "Password reset successful.",
      });
    } catch (error) {
      console.error(
        "Reset password error:",
        error
      );

      res.status(500).json({
        message:
          "Server error",
      });
    }
  };

// =====================================================
// GOOGLE AUTH
// =====================================================

export const googleAuth =
  async (req, res) => {
    try {
      const { token } =
        req.body;

      const ticket =
        await googleClient.verifyIdToken(
          {
            idToken: token,
            audience:
              process.env.GOOGLE_CLIENT_ID,
          }
        );

      const payload =
        ticket.getPayload();

      const {
        email,
        name,
        picture,
      } = payload;

      let user =
        await User.findOne({
          email,
        });

      if (!user) {
        const randomPassword =
          generateRandomPassword();

        const hashed =
          await bcrypt.hash(
            randomPassword,
            10
          );

        user =
          new User({
            name,
            email,
            password:
              hashed,
            image:
              picture ||
              "",
            role: "user",
            verified: true,
          });

        await user.save();
      } else {
        if (!user.verified) {
          user.verified =
            true;

          await user.save();
        }
      }

      const jwtToken =
        jwt.sign(
          {
            id: user._id,
            role: "user",
          },
          process.env.JWT_SECRET,
          {
            expiresIn:
              "7d",
          }
        );

      res.status(200).json({
        success: true,
        token:
          jwtToken,

        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: "user",
          favourites:
            user.favourites ||
            [],
          bookings:
            user.bookings ||
            [],
        },
      });
    } catch (error) {
      console.error(
        "Google auth error:",
        error
      );

      res.status(500).json({
        message:
          "Google authentication failed.",
      });
    }
  };

// =====================================================
// GET CURRENT USER
// -----------------------------------------------------
// IMPORTANT UPDATE:
// Before returning the user's favourites, expired/
// inactive favourites are removed from the Users table.
//
// This means every /user/me request automatically keeps
// User.favourites synchronized with active/future shows.
// =====================================================

export const getCurrentUser =
  async (req, res) => {
    try {
      const userId =
        req.user.id;

      const user =
        await User.findById(
          userId
        )
          .select("-password")
          .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      // -------------------------------------------------
      // LOAD USER AS DOCUMENT SO WE CAN UPDATE
      // THE DATABASE IF NECESSARY
      // -------------------------------------------------

      const userDocument =
        await User.findById(
          userId
        );

      if (!userDocument) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      // -------------------------------------------------
      // CLEAN EXPIRED / INACTIVE FAVORITES
      // -------------------------------------------------

      const cleanupResult =
        await cleanupExpiredUserFavourites(
          userDocument,
          req
        );

      const favouriteIds =
        Array.isArray(
          cleanupResult.favourites
        )
          ? cleanupResult.favourites.map(
              (id) =>
                String(id)
            )
          : [];

      // -------------------------------------------------
      // FETCH REMAINING FAVORITE MOVIES
      // -------------------------------------------------

      let favouriteMovies =
        [];

      if (
        favouriteIds.length >
        0
      ) {
        favouriteMovies =
          await Movie.find({
            _id: {
              $in:
                favouriteIds,
            },
          }).lean();

        favouriteMovies =
          favouriteIds
            .map(
              (id) =>
                favouriteMovies.find(
                  (movie) =>
                    String(
                      movie._id
                    ) === id
                )
            )
            .filter(Boolean);
      }

      // -------------------------------------------------
      // RETURN UPDATED USER
      // -------------------------------------------------

      return res.status(200).json({
        success: true,

        user: {
          _id: userDocument._id,
          name:
            userDocument.name,
          email:
            userDocument.email,
          image:
            userDocument.image,
          role:
            userDocument.role ||
            "user",

          // IMPORTANT:
          // This is now the CLEANED database array.
          favourites:
            favouriteIds,

          bookings:
            userDocument.bookings ||
            [],
        },

        favourites:
          favouriteMovies,

        favouriteCleanup: {
          changed:
            cleanupResult.changed,
          removedMovieIds:
            cleanupResult.removedMovieIds,
        },
      });
    } catch (error) {
      console.error(
        "Get current user error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to get user.",
      });
    }
  };

// =====================================================
// TOGGLE FAVOURITE
// =====================================================
//
// Existing behavior preserved.
//
// This still adds/removes a movie from User.favourites.
// The next /user/me request automatically cleans expired
// or inactive favourites from the database.
// =====================================================

export const toggleFavourite =
  async (req, res) => {
    try {
      const userId =
        req.user.id;

      const {
        movieId,
      } = req.params;

      if (!movieId) {
        return res.status(400).json({
          success: false,
          message:
            "Movie ID is required.",
        });
      }

      const movie =
        await Movie.findById(
          String(movieId)
        );

      if (!movie) {
        return res.status(404).json({
          success: false,
          message:
            "Movie not found.",
        });
      }

      const user =
        await User.findById(
          userId
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      if (
        !Array.isArray(
          user.favourites
        )
      ) {
        user.favourites =
          [];
      }

      const movieIdString =
        String(movie._id);

      const alreadyFavourite =
        user.favourites.some(
          (fid) =>
            String(fid) ===
            movieIdString
        );

      let isFavouriteNow;
      let message;

      if (
        alreadyFavourite
      ) {
        user.favourites =
          user.favourites.filter(
            (fid) =>
              String(fid) !==
              movieIdString
          );

        await user.save();

        isFavouriteNow =
          false;

        message =
          "Movie removed from favourites.";
      } else {
        user.favourites.push(
          movieIdString
        );

        await user.save();

        isFavouriteNow =
          true;

        message =
          "Movie added to favourites.";
      }

      // 🔔 Notify clients in real-time
      emitUserUpdated(
        req,
        userId,
        "favourite_toggled",
        {
          favourites:
            user.favourites,
          movieId:
            movieIdString,
          isFavourite:
            isFavouriteNow,
        }
      );

      return res.status(200).json({
        success: true,
        isFavourite:
          isFavouriteNow,
        message,

        favourites:
          user.favourites,
      });
    } catch (error) {
      console.error(
        "Favourite error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update favourites.",
      });
    }
  };

// =====================================================
// CREATE BOOKING
// =====================================================

export const createBooking =
  async (req, res) => {
    try {
      const userId =
        req.user.id;

      const {
        movie,
        show,
        date,
        time,
        seats,
      } = req.body;

      if (
        !movie ||
        !date ||
        !time ||
        !seats
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Movie, date, time and seats are required.",
        });
      }

      if (
        !Array.isArray(
          seats
        ) ||
        seats.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please select at least one seat.",
        });
      }

      const user =
        await User.findById(
          userId
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      user.bookings.push({
        movie:
          String(movie),

        show:
          show ||
          undefined,

        date,
        time,
        seats,
      });

      await user.save();

      const booking =
        user.bookings[
          user.bookings.length -
            1
        ];

      // 🔔 Notify clients in real-time
      emitUserUpdated(
        req,
        userId,
        "booking_added",
        {
          bookingId:
            booking._id,
          totalBookings:
            user.bookings.length,
        }
      );

      return res.status(201).json({
        success: true,
        message:
          "Booking saved successfully.",
        booking,
      });
    } catch (error) {
      console.error(
        "Booking error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to create booking.",
      });
    }
  };

// =====================================================
// GET MY BOOKINGS
// =====================================================

export const getMyBookings =
  async (req, res) => {
    try {
      const userId =
        req.user.id;

      const user =
        await User.findById(
          userId
        )
          .populate(
            "bookings.movie"
          )
          .populate(
            "bookings.show"
          );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      return res.status(200).json({
        success: true,
        bookings:
          user.bookings,
      });
    } catch (error) {
      console.error(
        "Get bookings error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to get bookings.",
      });
    }
  };

// =====================================================
// UPDATE USER PROFILE
// =====================================================

export const updateUser =
  async (req, res) => {
    try {
      const userId =
        req.user.id;

      const {
        name,
        email,
        currentPassword,
        newPassword,
      } = req.body;

      const user =
        await User.findById(
          userId
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      if (name) {
        user.name =
          name.trim();
      }

      if (email) {
        const trimmedEmail =
          email
            .trim()
            .toLowerCase();

        // Validate Gmail
        if (
          !isValidGmail(
            trimmedEmail
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid email format. Only Gmail addresses are allowed.",
          });
        }

        const existing =
          await User.findOne({
            email:
              trimmedEmail,

            _id: {
              $ne: userId,
            },
          });

        if (existing) {
          return res.status(400).json({
            success: false,
            message:
              "Email already in use.",
          });
        }

        user.email =
          trimmedEmail;
      }

      if (
        currentPassword &&
        newPassword
      ) {
        const isMatch =
          await bcrypt.compare(
            currentPassword,
            user.password
          );

        if (!isMatch) {
          return res.status(400).json({
            success: false,
            message:
              "Current password is incorrect.",
          });
        }

        const salt =
          await bcrypt.genSalt(
            10
          );

        user.password =
          await bcrypt.hash(
            newPassword,
            salt
          );
      } else if (
        newPassword &&
        !currentPassword
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Current password is required to set a new password.",
        });
      }

      await user.save();

      const updatedUser =
        user.toObject();

      delete updatedUser.password;

      // 🔔 Notify clients
      emitUserUpdated(
        req,
        userId,
        "profile_updated",
        {
          user: {
            _id:
              updatedUser._id,
            name:
              updatedUser.name,
            email:
              updatedUser.email,
            image:
              updatedUser.image,
            role:
              updatedUser.role ||
              "user",
            favourites:
              updatedUser.favourites ||
              [],
            bookings:
              updatedUser.bookings ||
              [],
          },
        }
      );

      res.status(200).json({
        success: true,
        message:
          "Profile updated successfully.",
        user:
          updatedUser,
      });
    } catch (error) {
      console.error(
        "Update user error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to update profile.",
      });
    }
  };

// =====================================================
// COLLABORATIVE FILTERING
// -----------------------------------------------------
// Used for HOME PAGE / NOW SHOWING
//
// Algorithm:
// 1. Get all movie ratings
// 2. Build user-movie matrix
// 3. Compare movies using cosine similarity
// 4. Use ratings of current user
// 5. Predict ratings for unrated movies
// 6. Similarity threshold = 0.5
// 7. Keep only movies with active/future shows
// 8. Return top 4
// =====================================================

const cosineSimilarity = (
  vec1,
  vec2
) => {
  let dot = 0;
  let len1 = 0;
  let len2 = 0;

  for (
    let i = 0;
    i < vec1.length;
    i++
  ) {
    dot +=
      Number(vec1[i]) *
      Number(vec2[i]);

    len1 +=
      Number(vec1[i]) **
      2;
  }

  for (
    const value of vec2
  ) {
    len2 +=
      Number(value) ** 2;
  }

  if (
    len1 === 0 ||
    len2 === 0
  ) {
    return 0;
  }

  return (
    dot /
    (
      Math.sqrt(len1) *
      Math.sqrt(len2)
    )
  );
};

// =====================================================
// GET HOME RECOMMENDATIONS
// -----------------------------------------------------
// Route:
// GET /user/recommendations/:userId
// =====================================================

export const getHomeRecommendations =
  async (req, res) => {
    try {
      const userId =
        String(
          req.params.userId ||
          req.user?.id ||
          req.user?._id ||
          ""
        );

      // -------------------------------------------------
      // CHECK USER ID
      // -------------------------------------------------

      if (!userId) {
        return res.status(400).json({
          success: false,
          message:
            "User ID is required.",
          recommendations: [],
        });
      }

      // -------------------------------------------------
      // FIND USER
      // -------------------------------------------------

      const currentUser =
        await User.findById(
          userId
        ).lean();

      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
          recommendations: [],
        });
      }

      // -------------------------------------------------
      // GET ALL MOVIES
      // -------------------------------------------------

      const movies =
        await Movie.find({})
          .lean();

      // -------------------------------------------------
      // BUILD USER-MOVIE RATING MATRIX
      // -------------------------------------------------

      const matrix = {};

      for (
        const movie of movies
      ) {
        const movieId =
          String(movie._id);

        const ratings =
          Array.isArray(
            movie.ratings
          )
            ? movie.ratings
            : [];

        for (
          const ratingItem of ratings
        ) {
          const ratedUserId =
            String(
              ratingItem?.userId ||
              ""
            );

          const ratingValue =
            Number(
              ratingItem?.rating
            );

          if (
            !ratedUserId ||
            !Number.isFinite(
              ratingValue
            ) ||
            ratingValue < 1 ||
            ratingValue > 5
          ) {
            continue;
          }

          if (
            !matrix[
              ratedUserId
            ]
          ) {
            matrix[
              ratedUserId
            ] = {};
          }

          matrix[
            ratedUserId
          ][movieId] =
            ratingValue;
        }
      }

      // -------------------------------------------------
      // CURRENT USER RATINGS
      // -------------------------------------------------

      const userRatings =
        matrix[userId] || {};

      // -------------------------------------------------
      // GET ACTIVE/FUTURE SHOWS
      // -------------------------------------------------

      const activeShows =
        await Show.find({
          showDateTime: {
            $gte:
              new Date(),
          },
        })
          .select("movie")
          .lean();

      const activeMovieIds =
        new Set(
          activeShows
            .map((show) => {
              if (!show?.movie) {
                return null;
              }

              return String(
                typeof show.movie ===
                  "object"
                  ? show.movie._id
                  : show.movie
              );
            })
            .filter(Boolean)
        );

      // -------------------------------------------------
      // USER HAS NOT RATED ANY MOVIE
      // -------------------------------------------------

      if (
        Object.keys(
          userRatings
        ).length === 0
      ) {
        const fallbackRecommendations =
          movies
            .filter(
              (movie) =>
                activeMovieIds.has(
                  String(
                    movie._id
                  )
                )
            )
            .map(
              (movie) => {
                const ratings =
                  Array.isArray(
                    movie.ratings
                  )
                    ? movie.ratings
                        .map(
                          (r) =>
                            Number(
                              r?.rating
                            )
                        )
                        .filter(
                          (value) =>
                            Number.isFinite(
                              value
                            ) &&
                            value >=
                              1 &&
                            value <=
                              5
                        )
                    : [];

                const average =
                  ratings.length >
                  0
                    ? ratings.reduce(
                        (
                          sum,
                          value
                        ) =>
                          sum +
                          value,
                        0
                      ) /
                      ratings.length
                    : Number(
                        movie.userRatingAvg
                      ) ||
                      Number(
                        movie.vote_average
                      ) ||
                      0;

                return {
                  movie,
                  average,
                  count:
                    ratings.length,
                };
              }
            )
            .sort(
              (a, b) => {
                if (
                  b.average !==
                  a.average
                ) {
                  return (
                    b.average -
                    a.average
                  );
                }

                return (
                  b.count -
                  a.count
                );
              }
            )
            .slice(
              0,
              4
            )
            .map(
              (item) =>
                item.movie
            );

        return res.status(200).json({
          success: true,
          algorithm:
            "collaborative-filtering-fallback",
          recommendations:
            fallbackRecommendations,
        });
      }

      // -------------------------------------------------
      // PREDICT RATINGS
      // -------------------------------------------------

      const predicted = {};

      for (
        const candidateMovie of movies
      ) {
        const candidateMovieId =
          String(
            candidateMovie._id
          );

        // Only active/future movies
        if (
          !activeMovieIds.has(
            candidateMovieId
          )
        ) {
          continue;
        }

        // Never recommend movie already rated
        if (
          Object.prototype.hasOwnProperty.call(
            userRatings,
            candidateMovieId
          )
        ) {
          continue;
        }

        let simSum = 0;
        let weightedSum = 0;

        // -------------------------------------------------
        // COMPARE CANDIDATE WITH USER'S RATED MOVIES
        // -------------------------------------------------

        for (
          const [
            ratedMovieId,
            currentUserRating,
          ] of Object.entries(
            userRatings
          )
        ) {
          const vec1 = [];
          const vec2 = [];

          for (
            const otherUserRatings of
              Object.values(
                matrix
              )
          ) {
            const candidateRating =
              otherUserRatings[
                candidateMovieId
              ];

            const ratedMovieRating =
              otherUserRatings[
                ratedMovieId
              ];

            if (
              candidateRating !==
                undefined &&
              ratedMovieRating !==
                undefined
            ) {
              vec1.push(
                candidateRating
              );

              vec2.push(
                ratedMovieRating
              );
            }
          }

          // -------------------------------------------------
          // CALCULATE SIMILARITY
          // -------------------------------------------------

          if (
            vec1.length > 0 &&
            vec2.length > 0
          ) {
            const similarity =
              cosineSimilarity(
                vec1,
                vec2
              );

            // Same threshold
            if (
              similarity >= 0.5
            ) {
              simSum +=
                similarity;

              weightedSum +=
                similarity *
                Number(
                  currentUserRating
                );
            }
          }
        }

        // -------------------------------------------------
        // PREDICTED RATING
        // -------------------------------------------------

        if (simSum > 0) {
          predicted[
            candidateMovieId
          ] =
            weightedSum /
            simSum;
        }
      }

      // -------------------------------------------------
      // SORT BY PREDICTED RATING
      // -------------------------------------------------

      const topIds =
        Object.entries(
          predicted
        )
          .sort(
            (a, b) =>
              b[1] - a[1]
          )
          .slice(
            0,
            4
          )
          .map(
            ([movieId]) =>
              movieId
          );

      // -------------------------------------------------
      // CONVERT IDS TO MOVIE OBJECTS
      // -------------------------------------------------

      let recommendedMovies =
        topIds
          .map(
            (movieId) =>
              movies.find(
                (movie) =>
                  String(
                    movie._id
                  ) ===
                  String(movieId)
              )
          )
          .filter(Boolean);

      // -------------------------------------------------
      // FALLBACK IF FEWER THAN 4
      // -------------------------------------------------

      if (
        recommendedMovies.length <
        4
      ) {
        const existingIds =
          new Set(
            recommendedMovies.map(
              (movie) =>
                String(
                  movie._id
                )
            )
          );

        const fallbackMovies =
          movies
            .filter(
              (movie) => {
                const movieId =
                  String(
                    movie._id
                  );

                return (
                  activeMovieIds.has(
                    movieId
                  ) &&
                  !existingIds.has(
                    movieId
                  ) &&
                  !Object.prototype.hasOwnProperty.call(
                    userRatings,
                    movieId
                  )
                );
              }
            )
            .map(
              (movie) => {
                const ratings =
                  Array.isArray(
                    movie.ratings
                  )
                    ? movie.ratings
                        .map(
                          (r) =>
                            Number(
                              r?.rating
                            )
                        )
                        .filter(
                          (value) =>
                            Number.isFinite(
                              value
                            ) &&
                            value >=
                              1 &&
                            value <=
                              5
                        )
                    : [];

                const average =
                  ratings.length >
                  0
                    ? ratings.reduce(
                        (
                          sum,
                          value
                        ) =>
                          sum +
                          value,
                        0
                      ) /
                      ratings.length
                    : Number(
                        movie.userRatingAvg
                      ) ||
                      Number(
                        movie.vote_average
                      ) ||
                      0;

                return {
                  movie,
                  average,
                  count:
                    ratings.length,
                };
              }
            )
            .sort(
              (a, b) => {
                if (
                  b.average !==
                  a.average
                ) {
                  return (
                    b.average -
                    a.average
                  );
                }

                return (
                  b.count -
                  a.count
                );
              }
            )
            .slice(
              0,
              4 -
                recommendedMovies.length
            )
            .map(
              (item) =>
                item.movie
            );

        recommendedMovies =
          [
            ...recommendedMovies,
            ...fallbackMovies,
          ];
      }

      // -------------------------------------------------
      // RETURN MAXIMUM 4
      // -------------------------------------------------

      return res.status(200).json({
        success: true,

        algorithm:
          "collaborative-filtering-cosine-similarity",

        recommendations:
          recommendedMovies.slice(
            0,
            4
          ),
      });
    } catch (error) {
      console.error(
        "Home Recommendation Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to generate movie recommendations.",
        recommendations: [],
      });
    }
  };