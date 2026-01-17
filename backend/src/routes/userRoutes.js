import express from "express";
import {
  getAllUsers,
  getActiveUsers,
  getUserById,
  getUserTickets,
  updateUser,
  updateUserStatus,
  changePassword
} from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Specific routes FIRST (before /:id)
router.get("/active", protect, getActiveUsers);
router.post("/:id/change-password", protect, changePassword);
router.get("/:id/tickets", protect, getUserTickets);
router.patch("/:id/status", protect, updateUserStatus);

// Dynamic routes LAST
router.get("/", protect, getAllUsers);
router.get("/:id", protect, getUserById);
router.put("/:id", protect, updateUser);

export default router;