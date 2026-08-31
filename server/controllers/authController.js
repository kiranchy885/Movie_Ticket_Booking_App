import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const createToken = (
  user
) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      isAdmin: user.isAdmin,
    },

    process.env.JWT_SECRET,

    {
      expiresIn: "7d",
    }
  );
};

// ------------------------------------------------
// SIGNUP
// ------------------------------------------------

export const signup = async (
  req,
  res
) => {
  try {
    const {
      name,
      email,
      password,
    } = req.body;

    if (
      !name ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required.",
      });
    }

    const existingUser =
      await User.findOne({
        email,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "Email already registered.",
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    const user =
      await User.create({
        _id:
          `user_${Date.now()}`,

        name,

        email,

        password:
          hashedPassword,

        image: "",

        favorites: [],
      });

    const token =
      createToken(user);

    res.status(201).json({
      success: true,

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin:
          user.isAdmin,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};

// ------------------------------------------------
// LOGIN
// ------------------------------------------------

export const login = async (
  req,
  res
) => {
  try {
    const {
      email,
      password,
    } = req.body;

    const user =
      await User.findOne({
        email,
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    const validPassword =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    const token =
      createToken(user);

    res.json({
      success: true,

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin:
          user.isAdmin,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};