import mongoose from "mongoose";
import { seedTheaters } from "../controllers/theaterController.js";

// ========================================
// CONNECT TO MONGODB
// ========================================

const connectDB = async () => {
  try {

    // Check whether MongoDB URL exists
    if (!process.env.MONGODB_URI) {
      console.error(
        "MONGODB_URI is not defined in .env file"
      );

      process.exit(1);
    }


    // Connect to MongoDB
    const conn = await mongoose.connect(
      process.env.MONGODB_URI
    );


    // Connection successful
    console.log(
      `MongoDB Connected Successfully: ${conn.connection.host}`
    );

    // ========================================
    // SEED DEFAULT THEATERS
    // ========================================
    await seedTheaters();

  } catch (error) {

    console.error(
      "MongoDB Connection Error:",
      error.message
    );

    process.exit(1);
  }
};


export default connectDB;