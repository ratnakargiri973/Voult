import dotenv from 'dotenv'
import jwt from 'jsonwebtoken';

dotenv.config();

export const generateToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email },   
    process.env.JWT_SECRET,                
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
  );