import dotenv from "dotenv";
import connectDB from "../configs/db.js";
import MovieCenter from "../models/MovieCenter.js";

dotenv.config();

const centers = [
  {
    name: "QFX Civil Mall",
    address: "Sundhara, Kathmandu",
    city: "Kathmandu",
    latitude: 27.70169,
    longitude: 85.31532,
    phone: "01-4220000",
  },

  {
    name: "QFX Labim Mall",
    address: "Pulchowk, Lalitpur",
    city: "Lalitpur",
    latitude: 27.67714,
    longitude: 85.31625,
    phone: "01-5555555",
  },

  {
    name: "Big Movies",
    address: "Kamalpokhari, Kathmandu",
    city: "Kathmandu",
    latitude: 27.70656,
    longitude: 85.32472,
    phone: "01-4422222",
  },

  {
    name: "FCUBE Cinemas",
    address: "KL Tower, Chabahil, Kathmandu",
    city: "Kathmandu",
    latitude: 27.7162,
    longitude: 85.3466,
    phone: "01-4488888",
  },
];

const seed = async () => {
  try {
    await connectDB();

    await MovieCenter.deleteMany({});

    await MovieCenter.insertMany(
      centers
    );

    console.log(
      "Movie centers added successfully."
    );

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seed();