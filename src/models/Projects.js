import mongoose from "mongoose";


const BuildingUnit = {
    footage: String,
    price: String,
}

const LocationItem = {
    name: String,
    distance: String,
}

const AttachmentItem = {
    name: String,
    url: String,
    type: String,
}

const CopyMessage = {
    title: String,
    message: String,
    createdAt: { type: Date, default: Date.now },
}

const Owner = {
    id: String,
    role: String,
}

const TypeList = "HIS" | "R2V" | "HMP" | "NR";

const ProjectSchema = new mongoose.Schema({
    info: {
        name: { type: String, required: true },
        address: { type: String, default: null },
        developer: { type: String, default: null },
        company: { type: String, default: null },
        launchDate: { type: Date, default: Date.now },
        releaseDate: { type: Date, default: Date.now },
        details: { type: String, default: "" }
    },
    type: {
        type: [TypeList],
        required: true,
    },
    owner: {
        type: [Owner],
        required: true,
    },
    units: {
        type: [BuildingUnit],
        required: false,
        default: []
    },
    location: {
        type: [LocationItem],
        required: false,
        default: []
    },
    attachments: {
        type: [AttachmentItem],
        required: false,
        default: []
    },
    copyMessages: {
        type: [CopyMessage],
        required: false,
        default: []
    },
    createdAt: { type: Date, default: Date.now },
    customersLists: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CustomerList",
            required: false,
            default: null
        }
    ]
});

const Project = mongoose.model("Project", ProjectSchema);

export default Project;
