import Attachments from "../models/Attachments.js";
import { google } from "googleapis";
import { Readable } from "stream";
import dotenv from "dotenv";
import User from "../models/User.js"

dotenv.config();

// Configurar OAuth 2.0
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

export const getAuthUrl = (req, res) => {
  try {
    const scopes = ["https://www.googleapis.com/auth/drive"];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
    });

    res.status(200).json({ authUrl });
  } catch (error) {
    console.error("Error generating auth URL:", error);
    res.status(500).json({ error: "Failed to generate auth URL" });
  }
};

export const handleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: "No authorization code provided" });
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Salvar o refresh token para uso posterior
    res.status(200).json({
      message: "Authorization successful",
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
    });
  } catch (error) {
    console.error("Error handling callback:", error);
    res.status(500).json({ error: "Failed to handle authorization callback" });
  }
};

export const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const { name, ownerId, projectId, refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    const owner = await User.findById(ownerId);

    if (!owner) {
      return res.status(404).json({ error: "Owner not found" });
    }

    // Configurar credenciais com refresh token
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const file = req.file;

    const fileMetadata = {
      name: name || file.originalname,
      parents: process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : undefined,
    };

    const fileStream = Readable.from(file.buffer);

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: file.mimetype,
        body: fileStream,
      },
      fields: "id, name, mimeType, webViewLink",
    });

    const fileId = response.data.id;
    const fileUrl = response.data.webViewLink;

    // Tornar o arquivo visualizável publicamente (opcional)
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // Salvar no MongoDB
    const attachment = new Attachments({
      name: response.data.name,
      type: file.mimetype,
      fileUrl: fileUrl,
      ownerId: ownerId,
      projectId: projectId,
    });

    await attachment.save();

    res.status(201).json({
      message: "Attachment uploaded successfully",
      data: {
        id: attachment._id,
        name: attachment.name,
        type: attachment.type,
        fileUrl: attachment.fileUrl,
        driveFileId: fileId,
      },
    });
  } catch (error) {
    console.error("Error uploading attachment:", error);
    res.status(500).json({ error: error.message || "Failed to upload attachment" });
  }
};

export const getAttachments = async (req, res) => {

  const ownerId = req.params.ownerId;

  try {
    const attachments = await Attachments.find({ ownerId });
    res.status(200).json(attachments);
  } catch (error) {
    console.error("Error fetching attachments:", error);
    res.status(500).json({ error: "Failed to fetch attachments" });
  }
};