import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema({
    name: String,
    phone: String,
    owner: String,
    customerLists: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CustomerList",
            required: false,
            default: []
        }
    ],
    projects: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: false,
            default: []
        }
    ],
    createdAt: { type: Date, default: Date.now },
    followUps: { type: [String], default: [] },
    labels: { type: [String], default: [] },
    stage: { type: String, default: "Aguardando Contato" },
    message: String,
    createdAt: { type: Date, default: Date.now }
});

const Customer = mongoose.model("Customer", CustomerSchema);

export default Customer;
