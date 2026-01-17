import express from "express";
import {
  createProject,
  getAllProjects,
  updateProject,
  deleteProject
} from "../controllers/projectController.js";
import protect from "../middleware/authMiddleware.js";
import { body } from "express-validator";

const router = express.Router();

/* CREATE PROJECT (ADMIN ONLY) */
router.post(
  "/",
  protect,
  [
    body("name").isLength({ min: 1, max: 100 }).trim(),
  ],
  createProject
);

/* GET ALL PROJECTS */
router.get("/", protect, getAllProjects);

/* UPDATE PROJECT (ADMIN ONLY) */
router.put("/:id", protect, updateProject);

/* DELETE PROJECT (ADMIN ONLY) */
router.delete("/:id", protect, deleteProject);

export default router;