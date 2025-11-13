import * as sessionManager from "../service/sessionManager.js";

export const sendMessage = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { number, message } = req.body;

        const session = sessionManager.getSession(sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Sessão não encontrada. Conecte-se primeiro."
            });
        }

        if (!session.isConnected) {
            return res.status(400).json({
                success: false,
                error: "WhatsApp não está conectado",
                message: "Conecte o WhatsApp via QR Code antes de enviar mensagens"
            });
        }

        if (!number || !message) {
            return res.status(400).json({
                success: false,
                error: "Número e mensagem são obrigatórios"
            });
        }

        const result = await session.sendMessage(number, message);
        res.json({
            success: true,
            result,
            message: "Mensagem enviada com sucesso"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Falha ao enviar mensagem"
        });
    }
};