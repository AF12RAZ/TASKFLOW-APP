import User from "../models/user.js";
import Ticket from "../models/ticket.js";
import bcrypt from "bcrypt";

/* =========================
   GET ALL USERS WITH STATS
========================= */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    // Get ticket counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const createdTickets = await Ticket.countDocuments({ creator: user._id });
        const assignedTickets = await Ticket.countDocuments({ assignee: user._id });

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          createdTickets: createdTickets,
          assignedTickets: assignedTickets
        };
      })
    );

    res.json({
      success: true,
      data: usersWithStats
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users"
    });
  }
};

/* =========================
   TOGGLE USER STATUS
========================= */
export const toggleUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user._id.toString();

    // Prevent user from toggling their own status
    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own status"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    user.isActive = !user.isActive;
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
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error("Toggle user status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle user status"
    });
  }
};

/* =========================
   RESET USER PASSWORD
========================= */
export const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.params.id;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Prevent resetting password for ADMIN users
    if (user.role === "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Cannot reset password for admin users"
      });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password"
    });
  }
};

/* =========================
   DELETE USER
========================= */
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user._id.toString();

    // Prevent user from deleting themselves
    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Prevent deleting ADMIN users
    if (user.role === "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Cannot delete admin users"
      });
    }

    // Reassign tickets to current admin
    await Ticket.updateMany(
      { assignee: userId },
      { assignee: currentUserId }
    );

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: "User deleted successfully and tickets reassigned"
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user"
    });
  }
};