import { Router } from "express";
import { sendMessage } from "./controller/senderController.js";
import { getStatus, getQrCode, disconnect } from "./controller/connectionController.js";
import { createUser } from "./controller/userController.js";

const api = Router();

// send messages
api.post("/:sessionId/send-message", sendMessage);

// connections
api.get("/:sessionId/status", getStatus)
api.get("/:sessionId/qrcode", getQrCode)
api.post("/:sessionId/disconnect", disconnect)

// users
api.post("/user", createUser)

// default route
api.get("/", (req, res) => {
    res.send("Hello World!");
});

export default api;
