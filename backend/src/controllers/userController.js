import User from "../models/user.js";
import Ticket from "../models/ticket.js";
import bcrypt from "bcrypt";

/* =========================
   GET ALL USERS (ADMIN ONLY)
========================= */
export const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only admin can view all users"
      });
    }

    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    const transformedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    }));

    res.json({
      success: true,
      data: transformedUsers
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users"
    });
  }
};

/* =========================
   GET ACTIVE USERS (FOR ASSIGNMENT)
========================= */
export const getActiveUsers = async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select("name email role")
      .sort({ name: 1 });

    const transformedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    }));

    res.json({
      success: true,
      data: transformedUsers
    });
  } catch (error) {
    console.error("Get active users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active users"
    });
  }
};

/* =========================
   GET USER BY ID
========================= */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const createdTickets = await Ticket.countDocuments({ creator: user._id });
    const assignedTickets = await Ticket.countDocuments({ assignee: user._id });
    const closedTickets = await Ticket.countDocuments({ 
      creator: user._id, 
      status: "Closed" 
    });

    res.json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
        stats: {
          createdTickets,
          assignedTickets,
          closedTickets
        }
      }
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user"
    });
  }
};

/* =========================
   GET USER'S TICKETS
========================= */
export const getUserTickets = async (req, res) => {
  try {
    const userId = req.params.id;
    const { type = "created" } = req.query;

    let filter = {};
    if (type === "created") {
      filter.creator = userId;
    } else if (type === "assigned") {
      filter.assignee = userId;
    }

    const tickets = await Ticket.find(filter)
      .populate("creator", "name email role")
      .populate("assignee", "name email role")
      .sort({ createdAt: -1 });

    const transformedTickets = tickets.map(ticket => ({
      id: ticket._id.toString(),
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      creator_id: ticket.creator?._id.toString(),
      assignee_id: ticket.assignee?._id?.toString(),
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
      } : undefined
    }));

    res.json({
      success: true,
      data: transformedTickets
    });
  } catch (error) {
    console.error("Get user tickets error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user tickets"
    });
  }
};

/* =========================
   UPDATE USER (NAME)
========================= */
export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name } = req.body;

    if (userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own information"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (name) user.name = name;
    await user.save();

    res.json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      },
      message: "User updated successfully"
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user"
    });
  }
};

/* =========================
   UPDATE USER STATUS (ADMIN ONLY)
========================= */
export const updateUserStatus = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only admin can update user status"
      });
    }

    const { isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account"
      });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      },
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user status"
    });
  }
};

/* =========================
   CHANGE PASSWORD
========================= */
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user._id.toString();
    const targetUserId = req.params.id;

    console.log('=== PASSWORD CHANGE DEBUG ===');
    console.log('User ID from token:', userId);
    console.log('Target user ID:', targetUserId);
    console.log('Old password received:', oldPassword ? 'Yes' : 'No');
    console.log('New password received:', newPassword ? 'Yes' : 'No');

    if (userId !== targetUserId) {
      return res.status(403).json({
        success: false,
        message: "You can only change your own password"
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long"
      });
    }

    const user = await User.findById(targetUserId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log('User found:', user.email);
    console.log('Stored password hash exists:', user.password ? 'Yes' : 'No');
    console.log('Stored password hash length:', user.password ? user.password.length : 0);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    console.log('Password changed successfully');

    res.json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password"
    });
  }
};