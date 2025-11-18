import mongoose from "mongoose";

const CustomerListSchema = new mongoose.Schema({
    name: String,
    owner: String,
    customers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: false,
            default: []
        }
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const CustomerList = mongoose.model("CustomerList", CustomerListSchema);

export default CustomerList;
