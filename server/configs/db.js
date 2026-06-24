import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("DB Connection Error:", error);
    process.exit(1);
  }
};

export default connectDB;

// import mongoose from "mongoose";

// const connectDB = async () =>{
//     try {
//         mongoose.connection.on('connected', ()=> console.log('Database Connected'));
//         await mongoose.connect(`${process.env.MONGODB_URI}/quickshow`)
//     } catch (error) {
//         console.log(error.message);
//     }
// }

