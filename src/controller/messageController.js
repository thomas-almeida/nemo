import Messages from "../models/Messages.js";
import User from "../models/User.js";
import Project from "../models/Projects.js";

export const createMessage = async (req, res) => {
    try {
        const { name, copy, ownerId, projectId } = req.body;

        const user = await User.findById(ownerId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const message = new Messages({ name, copy, ownerId, projectId });
        await message.save();
        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getMessages = async (req, res) => {

    const ownerId = req.params.ownerId;

    try {
        const messages = await Messages.find({ ownerId });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};