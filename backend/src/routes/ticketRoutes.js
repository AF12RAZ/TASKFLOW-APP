import express from "express";
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  updateTicketStatus,
  deleteTicket
} from "../controllers/ticketController.js";
import protect from "../middleware/authMiddleware.js";
import { body } from "express-validator";

const router = express.Router();

/* CREATE TICKET */
router.post(
  "/",
  protect,
  [
    body("title").isLength({ min: 1, max: 200 }),
    body("description").isLength({ min: 1, max: 2000 })
  ],
  createTicket
);

/* GET ALL TICKETS */
router.get("/", protect, getTickets);

/* GET SINGLE TICKET */
router.get("/:id", protect, getTicketById);

/* UPDATE TICKET DETAILS (title, description, priority, assignee) */
router.put("/:id", protect, updateTicket);

/* UPDATE STATUS ONLY */
router.patch(
  "/:id/status",
  protect,
  body("status").isIn([
    "Open",
    "In Progress",
    "Sent for Closure",
    "Closed"
  ]),
  updateTicketStatus
);

/* DELETE TICKET */
router.delete("/:id", protect, deleteTicket);

export default router;