import express from "express";
import dotenv from "dotenv";
import connectDB from "./configs/db.js";
import showRouter from "./routes/showRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import userRouter from "./routes/userRoutes.js";
import centerRouter from "./routes/centerRoutes.js";

dotenv.config();

const app = express();

connectDB();

app.use(express.json());

// Routes
app.use('/api/show', showRouter);
app.use("/booking", bookingRouter)
app.use('/api/admin', adminRouter)
app.use('/api/center', centerRouter);
app.use("/user",userRouter)


app.get("/", (req, res) => {
  res.send("API Running");
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server started on port ${process.env.PORT || 3000}`);
});

// import express from 'express';
// import cors from 'cors';
// import 'dotenv/config';
// import connectDB from './configs/db.js';
// import { clerkMiddleware } from '@clerk/express'
// import { inngest, functions } from './inngest/index.js';
// import { serve }from "inngest/express";

// const app = express();
// const port = 3000;

// await connectDB()

// // Middleware
// app.use(express.json())
// app.use(cors())
// app.use(clerkMiddleware())

// //API Routes
// app.get('/', (req, res)=> res.send('Server is Live!'))
// app.use('/api/inngest', serve({ client: inngest, functions }))


// app.listen(port, ()=> console.log(`Server listening at http://localhost:${port}`));