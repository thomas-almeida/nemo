import mongoose from "mongoose";

const AttachmentsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    ownerId: { type: String, required: true },
    projectId: { type: String, required: true },
    type: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    publicLink: {
        type: String,
        default: ""
    }
})

const Attachments = mongoose.model("Attachments", AttachmentsSchema)

export default Attachments
