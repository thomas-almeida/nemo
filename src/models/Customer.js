import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema({
    name: String,
    phone: String,
    owner: String,
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
