import jwt, { decode } from "jsonwebtoken";

export const protect = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. Unauthorized.",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        res.user = decode;
        
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid details or expired.",
        });
    }
}