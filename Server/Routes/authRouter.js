import express from 'express'
const authRouter = express.Router();
import { logout, sendOtp, verifyOtp } from '../Controllers/AuthControllers/authController.js' 
import { verifyToken } from '../Middlewares/verifyToken.js';

authRouter.post("/send-otp", sendOtp);
authRouter.post("/verify-otp", verifyOtp);
authRouter.post("/logout",      verifyToken, logout); 

export default authRouter;