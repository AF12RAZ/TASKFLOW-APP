import express from "express";
import {
  getAllUsers,
  toggleUserStatus,
  resetPassword,
  deleteUser
} from "../controllers/adminController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin middleware
const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === "ADMIN") {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Admin only."
    });
  }
};

/* GET ALL USERS */
router.get("/users", protect, adminMiddleware, getAllUsers);

/* TOGGLE USER STATUS */
router.put("/users/:id/toggle-status", protect, adminMiddleware, toggleUserStatus);

/* RESET USER PASSWORD */
router.post("/users/:id/reset-password", protect, adminMiddleware, resetPassword);

/* DELETE USER */
router.delete("/users/:id", protect, adminMiddleware, deleteUser);

export default router;
