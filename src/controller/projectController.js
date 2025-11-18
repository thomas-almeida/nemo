import Project from "../models/Projects.js";

// Create a new project
export const createProject = async (req, res) => {
    const { info, units = [], location = [], attachments = [], copyMessages = [], customersLists = [], owner } = req.body;

    if (!info.name || !info.address || !info.developer || !info.company) {
        return res.status(400).json({
            success: false,
            error: 'Name, address, developer and company are required'
        });
    }

    try {
        const newProject = await Project.create({
            info,
            units,
            location,
            attachments,
            copyMessages,
            customersLists,
            owner
        });

        res.status(201).json({
            success: true,
            data: newProject
        });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create project'
        });
    }
};

// Get all projects
export const getProjects = async (req, res) => {

    const id = req.params;

    try {
        const projects = await Project.find({ owner: { id } });
        res.status(200).json({
            success: true,
            count: projects.length,
            data: projects
        });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch projects'
        });
    }
};

// Get a single project
export const getProjectById = async (req, res) => {
    const id = req.params;
    try {
        const project = await Project.findById(id).where({ owner: { id } });
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }
        res.status(200).json({
            success: true,
            data: project
        });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch project'
        });
    }
};

export const updateProject = async (req, res) => {
    const { id } = req.params;
    const { userId, userRole } = req.body; // Assuming these are passed in the request body
    
    if (!userId || !userRole) {
        return res.status(400).json({
            success: false,
            error: 'User ID and role are required in the request body'
        });
    }

    try {
        // First, find the project to check ownership
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        // Check if user is an owner with ADMIN role
        const isAdminOwner = project.owner.some(owner => 
            owner.id === userId && owner.role === 'ADMIN'
        );

        if (!isAdminOwner) {
            return res.status(403).json({
                success: false,
                error: 'Apenas administradores podem editar este projeto'
            });
        }

        // If user is authorized, proceed with the update
        const updatedProject = await Project.findByIdAndUpdate(
            id, 
            { 
                ...req.body,
                'info.updatedAt': Date.now() // Update the last modified timestamp
            }, 
            { new: true, runValidators: true }
        );
        
        res.status(200).json({
            success: true,
            data: updatedProject
        });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({
            success: false,
            error: 'Falha ao atualizar o projeto'
        });
    }
};

export const deleteProject = async (req, res) => {
    const { id } = req.params;
    const { userId, userRole } = req.body; // Assuming these are passed in the request body
    
    if (!userId || !userRole) {
        return res.status(400).json({
            success: false,
            error: 'User ID and role are required in the request body'
        });
    }

    try {
        // First, find the project to check ownership
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }
        res.status(200).json({
            success: true,
            data: project
        });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete project'
        });
    }
};