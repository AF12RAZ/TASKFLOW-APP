import Project from "../models/project.js";

/* CREATE PROJECT (ADMIN ONLY) */
export const createProject = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only admin can create projects"
      });
    }

    const { name, description, color } = req.body;

    const project = await Project.create({
      name,
      description,
      color: color || "#3B82F6",
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create project"
    });
  }
};

/* GET ALL PROJECTS */
export const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find({ isActive: true })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    const transformedProjects = projects.map(p => ({
      id: p._id.toString(),
      name: p.name,
      description: p.description,
      color: p.color,
      isActive: p.isActive,
      created_at: p.createdAt,
      createdBy: p.createdBy ? {
        name: p.createdBy.name,
        email: p.createdBy.email
      } : undefined
    }));

    res.json({
      success: true,
      data: transformedProjects
    });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch projects"
    });
  }
};

/* UPDATE PROJECT (ADMIN ONLY) */
export const updateProject = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only admin can update projects"
      });
    }

    const { name, description, color, isActive } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (color) project.color = color;
    if (isActive !== undefined) project.isActive = isActive;

    await project.save();

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update project"
    });
  }
};

/* DELETE PROJECT (ADMIN ONLY) */
export const deleteProject = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only admin can delete projects"
      });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Soft delete
    project.isActive = false;
    await project.save();

    res.json({
      success: true,
      message: "Project deleted successfully"
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete project"
    });
  }
};