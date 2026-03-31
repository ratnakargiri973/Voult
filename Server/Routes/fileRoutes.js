import express from "express";
import { upload } from "../Middlewares/multer.js";
import {
  uploadFile,
  getMyFiles,
  deleteFile,
} from "../Controllers/uploads/getMyFIles.js";
import { verifyToken } from '../Middlewares/verifyToken.js'

const fileRouter = express.Router();


fileRouter.post("/upload/:userId", verifyToken, upload.single("file"), uploadFile);
fileRouter.get("/my-files/:userId", verifyToken, getMyFiles);
fileRouter.delete("/delete/:fileId", verifyToken, deleteFile);

export default fileRouter;