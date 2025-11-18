import { Router } from "express";
import { sendMessage } from "./controller/senderController.js";
import { getStatus, getQrCode, disconnect } from "./controller/connectionController.js";
import { createUser, getUserById } from "./controller/userController.js";
import { createCustomer, getCustomerById, getAllCustomers } from "./controller/customerController.js";

const api = Router();

// send messages
api.post("/:sessionId/send-message", sendMessage);

// connections
api.get("/:sessionId/status", getStatus)
api.get("/:sessionId/qrcode", getQrCode)
api.post("/:sessionId/disconnect", disconnect)

// users
api.post("/user", createUser)
api.get("/user/:id", getUserById)

// customers
api.post("/customer", createCustomer)
api.get("/customer/:id/:userId", getCustomerById)
api.get("/customer/:userId", getAllCustomers)

// default route
api.get("/", (req, res) => {
    res.send("Hello World!");
});

export default api;
