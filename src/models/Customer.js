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
    followUps: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FollowUp"
        }
    ]
});

const Customer = mongoose.model("Customer", CustomerSchema);

export default Customer;
