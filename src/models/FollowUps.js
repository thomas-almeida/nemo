import mongoose from "mongoose";

const FollowUpSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer"
    },
    labels: { type: [String], default: [] },
    stage: { type: String, default: "Aguardando Contato" },
    message: String,
    createdAt: { type: Date, default: Date.now }
});

const FollowUp = mongoose.model("FollowUp", FollowUpSchema);

export default FollowUp;
