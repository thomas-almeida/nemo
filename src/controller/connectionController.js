import * as sessionManager from "../service/sessionManager.js";
import logger from "../service/logger.js";

export const getStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = sessionManager.getSession(sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Sessão não encontrada. Gere um QR Code primeiro."
            });
        }

        const detailedStatus = session.getDetailedStatus();

        res.json({
            success: true,
            ...detailedStatus,
            status: session.isConnected ? "connected" : "disconnected",
            message: session.isConnected ?
                "WhatsApp conectado com sucesso" :
                `WhatsApp desconectado - QR Code disponível em /${sessionId}/qrcode`
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Erro ao obter status"
        });
    }
};

export const getQrCode = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await sessionManager.createSession(sessionId);

        if (session.isConnected) {
            return res.json({
                success: true,
                status: "connected",
                message: "WhatsApp já está conectado nesta sessão."
            });
        }

        // Aguarda o QR code ser gerado (com timeout)
        await session.waitForQrCode();
        const qrCodeBase64 = await session.getQrCode();

        res.json({
            success: true,
            qrCode: qrCodeBase64,
            status: "ready",
            message: "Escaneie este QR Code no WhatsApp."
        });

    } catch (error) {
        logger.error(`❌ Erro no endpoint /qrcode para a sessão ${req.params.sessionId}:`, error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: error.message.includes("Timeout") ? 
                "Falha ao gerar QR Code. Tente novamente." : 
                "Erro interno ao gerar QR Code."
        });
    }
};

export const disconnect = async (req, res) => {
    try {
        const { sessionId } = req.params;
        logger.info(`🛑 Recebida requisição de disconnect para a sessão ${sessionId}`);

        const success = await sessionManager.deleteSession(sessionId);

        if (success) {
            res.json({
                success: true,
                message: "Sessão desconectada e removida com sucesso."
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Sessão não encontrada."
            });
        }
    } catch (error) {
        logger.error(`❌ Erro no endpoint de disconnect para a sessão ${req.params.sessionId}:`, error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Falha ao desconectar WhatsApp"
        });
    }
};