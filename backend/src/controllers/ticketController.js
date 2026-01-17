import Ticket from "../models/ticket.js";
import AuditLog from "../models/auditLog.js";
import { sendTicketClosureRequest, sendTicketRejection, sendTicketClosed } from "../utils/emailService.js";

/* =========================
   CREATE TICKET
========================= */
export const createTicket = async (req, res) => {
  try {
    const { title, description, priority, assignee_id, project_id } = req.body;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: "Project is required"
      });
    }

    const ticket = await Ticket.create({
      title,
      description,
      priority: priority || "Medium",
      assignee: assignee_id || null,
      project: project_id,
      creator: req.user._id,
      status: "Open"
    });

    await AuditLog.create({
      ticket: ticket._id,
      changedBy: req.user._id,
      action: "created",
      details: `Ticket created with status "Open"`
    });

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate("creator", "name email role")
      .populate("assignee", "name email role")
      .populate("project", "name color");

    res.status(201).json({
      success: true,
      data: populatedTicket
    });
  } catch (error) {
    console.error("Ticket creation error:", error);
    res.status(500).json({ 
      success: false,
      message: "Ticket creation failed", 
      error: error.message 
    });
  }
};

/* =========================
   GET ALL TICKETS
========================= */
export const getTickets = async (req, res) => {
  try {
    const { status, priority, project, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (project) filter.project = project;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const tickets = await Ticket.find(filter)
      .populate("creator", "name email role")
      .populate("assignee", "name email role")
      .populate("project", "name color")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Ticket.countDocuments(filter);

    const transformedTickets = tickets.map(ticket => ({
      id: ticket._id.toString(),
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      creator_id: ticket.creator?._id.toString(),
      assignee_id: ticket.assignee?._id?.toString(),
      project_id: ticket.project?._id?.toString(),
      closed_date: ticket.closedDate,
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt,
      creator: ticket.creator ? {
        id: ticket.creator._id.toString(),
        name: ticket.creator.name,
        email: ticket.creator.email,
        role: ticket.creator.role
      } : undefined,
      assignee: ticket.assignee ? {
        id: ticket.assignee._id.toString(),
        name: ticket.assignee.name,
        email: ticket.assignee.email,
        role: ticket.assignee.role
      } : undefined,
      project: ticket.project ? {
        id: ticket.project._id.toString(),
        name: ticket.project.name,
        color: ticket.project.color
      } : undefined
    }));

    res.json({
      success: true,
      data: {
        tickets: transformedTickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error("Fetch tickets error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch tickets" 
    });
  }
};

/* =========================
   GET SINGLE TICKET WITH AUDIT LOGS
========================= */
export const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("creator", "name email role")
      .populate("assignee", "name email role")
      .populate("project", "name color");

    if (!ticket) {
      return res.status(404).json({ 
        success: false,
        message: "Ticket not found" 
      });
    }

    const auditLogs = await AuditLog.find({ ticket: ticket._id })
      .populate("changedBy", "name email role")
      .sort({ createdAt: -1 });

    const transformedTicket = {
      id: ticket._id.toString(),
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      creator_id: ticket.creator?._id.toString(),
      assignee_id: ticket.assignee?._id?.toString(),
      project_id: ticket.project?._id?.toString(),
      closed_date: ticket.closedDate,
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt,
      creator: ticket.creator ? {
        id: ticket.creator._id.toString(),
        name: ticket.creator.name,
        email: ticket.creator.email,
        role: ticket.creator.role
      } : undefined,
      assignee: ticket.assignee ? {
        id: ticket.assignee._id.toString(),
        name: ticket.assignee.name,
        email: ticket.assignee.email,
        role: ticket.assignee.role
      } : undefined,
      project: ticket.project ? {
        id: ticket.project._id.toString(),
        name: ticket.project.name,
        color: ticket.project.color
      } : undefined
    };

    const transformedAuditLogs = auditLogs.map(log => ({
      id: log._id.toString(),
      ticket_id: log.ticket.toString(),
      action: log.action,
      old_status: log.oldStatus,
      new_status: log.newStatus,
      details: log.details,
      created_at: log.createdAt,
      changed_by: log.changedBy ? {
        id: log.changedBy._id.toString(),
        name: log.changedBy.name,
        email: log.changedBy.email,
        role: log.changedBy.role
      } : undefined
    }));

    res.json({
      success: true,
      data: {
        ticket: transformedTicket,
        auditLogs: transformedAuditLogs
      }
    });
  } catch (error) {
    console.error("Fetch ticket error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch ticket" 
    });
  }
};

/* =========================
   UPDATE TICKET STATUS - WITH AUDIT LOGGING AND EMAIL
========================= */
export const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["Open", "In Progress", "Sent for Closure", "Closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value"
      });
    }

    const ticket = await Ticket.findById(req.params.id)
      .populate("creator", "name email role")
      .populate("assignee", "name email role")
      .populate("project", "name color");

    if (!ticket) {
      return res.status(404).json({ 
        success: false,
        message: "Ticket not found" 
      });
    }

    const userId = req.user._id.toString();
    const isCreator = ticket.creator._id.toString() === userId;
    const isAssignee = ticket.assignee?._id?.toString() === userId;
    const isAdmin = req.user.role === "ADMIN";

    if (status === "In Progress") {
      if (!isCreator && !isAssignee && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Only the ticket creator or assignee can move to 'In Progress'"
        });
      }
    }

    if (status === "Sent for Closure") {
      if (!isCreator && !isAssignee) {
        return res.status(403).json({
          success: false,
          message: "Only the ticket creator or assignee can request closure"
        });
      }
    }

    if (status === "Closed") {
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Only admin can close tickets"
        });
      }
    }

    if (status === "In Progress" && ticket.status === "Sent for Closure") {
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Only admin can move ticket back to 'In Progress' from 'Sent for Closure'"
        });
      }
    }

    const oldStatus = ticket.status;
    ticket.status = status;

    if (status === "Closed") {
      ticket.closedDate = new Date();
    }

    await ticket.save();

    await AuditLog.create({
      ticket: ticket._id,
      changedBy: req.user._id,
      action: "status_changed",
      oldStatus,
      newStatus: status,
      details: `Status changed from "${oldStatus}" to "${status}" by ${req.user.name}`
    });

    try {
      if (status === "Sent for Closure") {
        await sendTicketClosureRequest(ticket, req.user);
        console.log("Closure request email sent to admin");
      }

      if (status === "In Progress" && oldStatus === "Sent for Closure" && isAdmin) {
        const notifyUser = ticket.assignee || ticket.creator;
        await sendTicketRejection(ticket, req.user, notifyUser);
        console.log("Rejection email sent to assignee/creator");
      }

      if (status === "Closed" && isAdmin) {
        await sendTicketClosed(ticket, req.user, ticket.creator);
        console.log("Closure email sent to creator");
      }
    } catch (emailError) {
      console.error("Email notification failed (non-critical):", emailError);
    }

    const transformedTicket = {
      id: ticket._id.toString(),
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      creator_id: ticket.creator?._id.toString(),
      assignee_id: ticket.assignee?._id?.toString(),
      project_id: ticket.project?._id?.toString(),
      closed_date: ticket.closedDate,
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt,
      creator: ticket.creator ? {
        id: ticket.creator._id.toString(),
        name: ticket.creator.name,
        email: ticket.creator.email,
        role: ticket.creator.role
      } : undefined,
      assignee: ticket.assignee ? {
        id: ticket.assignee._id.toString(),
        name: ticket.assignee.name,
        email: ticket.assignee.email,
        role: ticket.assignee.role
      } : undefined,
      project: ticket.project ? {
        id: ticket.project._id.toString(),
        name: ticket.project.name,
        color: ticket.project.color
      } : undefined
    };

    res.json({
      success: true,
      data: transformedTicket,
      message: `Status changed from "${oldStatus}" to "${status}"`
    });
  } catch (error) {
    console.error("Status update error:", error);
    res.status(500).json({ 
      success: false,
      message: "Status update failed",
      error: error.message 
    });
  }
};

/* =========================
   UPDATE TICKET (EDIT DETAILS + REASSIGNMENT)
========================= */
export const updateTicket = async (req, res) => {
  try {
    const { title, description, priority, assignee_id } = req.body;

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    const userId = req.user._id.toString();
    const isCreator = ticket.creator.toString() === userId;
    const isAdmin = req.user.role === "ADMIN";

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the ticket creator or admin can edit ticket details"
      });
    }

    const changes = [];
    if (title && title !== ticket.title) changes.push(`title changed`);
    if (description && description !== ticket.description) changes.push(`description updated`);
    if (priority && priority !== ticket.priority) changes.push(`priority changed to ${priority}`);
    if (assignee_id !== undefined && assignee_id !== ticket.assignee?.toString()) {
      changes.push(assignee_id ? `reassigned to new user` : `assignee removed`);
    }

    if (title) ticket.title = title;
    if (description) ticket.description = description;
    if (priority) ticket.priority = priority;
    if (assignee_id !== undefined) {
      ticket.assignee = assignee_id || null;
    }

    await ticket.save();

    if (changes.length > 0) {
      await AuditLog.create({
        ticket: ticket._id,
        changedBy: req.user._id,
        action: "updated",
        details: `Ticket updated: ${changes.join(", ")}`
      });
    }

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate("creator", "name email role")
      .populate("assignee", "name email role")
      .populate("project", "name color");

    res.json({
      success: true,
      data: updatedTicket
    });
  } catch (error) {
    console.error("Update ticket error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update ticket",
      error: error.message
    });
  }
};

/* =========================
   DELETE TICKET (ADMIN ONLY)
========================= */
export const deleteTicket = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ 
        success: false,
        message: "Only admin can delete tickets" 
      });
    }

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ 
        success: false,
        message: "Ticket not found" 
      });
    }

    await AuditLog.create({
      ticket: ticket._id,
      changedBy: req.user._id,
      action: "deleted",
      details: `Ticket "${ticket.title}" deleted by ${req.user.name}`
    });

    await ticket.deleteOne();

    res.json({ 
      success: true,
      message: "Ticket deleted successfully" 
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ 
      success: false,
      message: "Delete failed" 
    });
  }
};