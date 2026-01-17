import express from "express";
import { register, login, getMe, adminForceResetPassword } from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";
import { body } from "express-validator";

const router = express.Router();

router.post(
  "/register",
  [
    body("name").notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 })
  ],
  register
);

router.post(
  "/login",
  [
    body("email").isEmail(),
    body("password").notEmpty()
  ],
  login
);

router.get("/me", protect, getMe);

/* ADMIN FORCE RESET (FOR TROUBLESHOOTING) */
router.post("/admin-force-reset", adminForceResetPassword);

export default router;