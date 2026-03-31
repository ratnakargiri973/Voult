
import express from "express";
import { verifyToken } from "../Middlewares/verifyToken.js";
import {
  getDashboardStats,
  getActivity,
  getProfile,
  toggleFileFlag,
  permanentDeleteFile,
  getSharedFiles,
  getTrashedFiles,
  restoreFile,
  getStarredFiles,
  unstarFile,
  starFile,
  editProfile,
} from "../Controllers/DashboardControllers/DashboardController.js";

import { shareFile, getShareHistory, revokeShare } from "../Controllers/DashboardControllers/shareController.js";

const dashboardRouter = express.Router();

// All routes protected
dashboardRouter.use(verifyToken);

dashboardRouter.get("/stats/:userId",         getDashboardStats);
dashboardRouter.get("/activity/:userId",     verifyToken, getActivity);
dashboardRouter.get("/profile/:userId",       verifyToken, getProfile);
dashboardRouter.put("/profile/:userId",  verifyToken, editProfile);
dashboardRouter.patch("/file/:fileId/toggle", toggleFileFlag);
dashboardRouter.delete("/file/:fileId",       permanentDeleteFile);


dashboardRouter.post("/share/:fileId",         verifyToken, shareFile);
dashboardRouter.get("/share-history/:fileId",  verifyToken, getShareHistory);
dashboardRouter.get("/shared-files/:userId", verifyToken, getSharedFiles);
dashboardRouter.patch("/share/:fileId/revoke", verifyToken, revokeShare);

dashboardRouter.get("/trash/:userId",              getTrashedFiles);
dashboardRouter.patch("/trash/:fileId/restore",    restoreFile);

dashboardRouter.patch("/starred/:fileId/star",   starFile);
dashboardRouter.get("/starred/:userId",             getStarredFiles);
dashboardRouter.patch("/starred/:fileId/unstar",    unstarFile);

export default dashboardRouter;