import mongoose from "mongoose";
import crypto from "crypto";

const UserSchema = new mongoose.Schema({
    username: String,
    email: {
        type: String,
        unique: true,
        required: true
    },
    phone: String,
    sessionId: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomUUID(),
    }
});

const User = mongoose.model("User", UserSchema);

export default User;