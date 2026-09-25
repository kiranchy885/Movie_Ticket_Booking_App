import express from "express";
import {
    registerUser,
    loginUser
} from "../controllers/authController.js";
const authRouter = express.Router();

authRouter.post("/signup", registerUser);
authRouter.post("/login", loginUser);

export default authRouter;