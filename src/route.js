import { Router } from "express";
import { sendMessage } from "./controller/senderController.js";
import { getStatus, getQrCode, disconnect } from "./controller/connectionController.js";
import { createUser, getUserById } from "./controller/userController.js";
import { createCustomer, getCustomerById, getAllCustomers, updateCustomer, deleteCustomer } from "./controller/customerController.js";
import { createMessage, getMessages } from "./controller/messageController.js";
import { uploadAttachment, getAttachments, getAuthUrl, handleCallback } from "./controller/attachmentController.js";
import upload from "./middleware/multer.js";
import {
    createCustomerList,
    getCustomerLists,
    getCustomerListById,
    updateCustomerList,
    deleteCustomerList,
    addCustomerToCustomerList
} from "./controller/customerListController.js";

import {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject
} from "./controller/projectController.js";

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
api.put("/customer/:id", updateCustomer)
api.delete("/customer/:id", deleteCustomer)

// customer lists
api.post("/customer-list", createCustomerList);
api.post("/customer-list/:id/customer", addCustomerToCustomerList);
api.get("/customer-list/owner/:ownerId", getCustomerLists);
api.get("/customer-list/:id/:userId", getCustomerListById);
api.put("/customer-list/:id", updateCustomerList);
api.delete("/customer-list/:id", deleteCustomerList);

// projects
api.post("/project", createProject);
api.get("/project/:id", getProjects);
api.get("/project/by-id/:id", getProjectById);
api.put("/project/:id", updateProject);
api.delete("/project/:id", deleteProject);

// messages
api.post("/message", createMessage);
api.get("/message/:ownerId", getMessages);

// attachments
api.post("/attachment", upload.single("file"), uploadAttachment);
api.get("/attachment/:ownerId", getAttachments);
api.get("/attachment/auth-url", getAuthUrl);
api.get("/attachment/callback", handleCallback);

// default route
api.get("/", (req, res) => {
    res.send("Nemo API is running!");
});

export default api;
