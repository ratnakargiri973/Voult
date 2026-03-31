import express, { urlencoded } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRouter from './Routes/authRouter.js';
import fileRouter from './Routes/fileRoutes.js';
import dashboardRouter from "./Routes/dashboardRouter.js";
import notificationRouter from './Routes/notificationRouter.js';
import cookieParser from 'cookie-parser';

dotenv.config();

const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;
const DB = process.env.DB;

const app = express();
const corsOption = {
    origin: "https://file-voult.onrender.com",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}

app.use(cors(corsOption));
app.options('*', cors(corsOption));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/api/v1/auth', authRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use('/api/v1/file', fileRouter);
app.use('/api/v1/notifications', notificationRouter);

mongoose
    .connect(MONGO_URI, { dbName: DB })
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on the port ${PORT}`);
        })
    })
    .catch((err) => {
        console.error('Failed to connect to mongodb', err);
    });