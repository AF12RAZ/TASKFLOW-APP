import Ticket from "../models/ticket.js";

/* DASHBOARD STATS */
export const getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const createdAtFilter =
      Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    // Total tickets
    const totalTickets = await Ticket.countDocuments(createdAtFilter);

    // Ticket counts by status
    const statusCounts = await Ticket.aggregate([
      { $match: createdAtFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Ticket counts by priority
    const priorityCounts = await Ticket.aggregate([
      { $match: createdAtFilter },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent tickets
    const recentTickets = await Ticket.find(createdAtFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("creator", "name email")
      .select("title status priority createdAt creator");

    // Format status counts for frontend
    const byStatus = {
      open: 0,
      inProgress: 0,
      sentForClosure: 0,
      closed: 0
    };

    statusCounts.forEach(item => {
      const status = item._id.toLowerCase().replace(/\s+/g, '');
      if (status === 'open') byStatus.open = item.count;
      if (status === 'inprogress') byStatus.inProgress = item.count;
      if (status === 'sentforclosure') byStatus.sentForClosure = item.count;
      if (status === 'closed') byStatus.closed = item.count;
    });

    // Format priority counts for frontend
    const byPriority = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    priorityCounts.forEach(item => {
      const priority = item._id.toLowerCase();
      if (priority === 'low') byPriority.low = item.count;
      if (priority === 'medium') byPriority.medium = item.count;
      if (priority === 'high') byPriority.high = item.count;
      if (priority === 'critical') byPriority.critical = item.count;
    });

    res.json({
      success: true,
      data: {
        stats: {
          total: totalTickets,
          byStatus,
          byPriority
        },
        recentActivity: recentTickets.map(ticket => ({
          id: ticket._id.toString(),
          title: ticket.title,
          status: ticket.status,
          priority: ticket.priority,
          created_at: ticket.createdAt,
          creator: ticket.creator ? {
            name: ticket.creator.name
          } : undefined
        }))
      }
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message
    });
  }
};