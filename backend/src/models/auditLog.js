import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    action: {
      type: String,
      enum: ["created", "status_changed", "updated", "deleted"],
      required: true
    },
    oldStatus: {
      type: String,
      default: null
    },
    newStatus: {
      type: String,
      default: null
    },
    details: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", auditLogSchema);