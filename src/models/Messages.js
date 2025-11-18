import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    copy: { type: String, required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    ownerId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Message", MessageSchema);
