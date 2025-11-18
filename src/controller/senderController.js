import * as sessionManager from "../service/sessionManager.js";

export const sendMessage = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { number, message, image, video, document } = req.body;

        // Validações iniciais
        if (!number) {
            return res.status(400).json({
                success: false,
                error: "Número é obrigatório"
            });
        }

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

        // Prepara os dados para envio
        const messageData = { 
            number,
            text: message || '' // Texto é opcional se for enviar apenas mídia
        };

        // Adiciona vídeo se existir (tem prioridade sobre imagem)
        if (video) {
            messageData.video = typeof video === 'string' ? { url: video } : video;
        }
        // Se não tiver vídeo, adiciona imagem se existir
        else if (image) {
            messageData.image = typeof image === 'string' ? { url: image } : image;
        }

        // Adiciona documento se existir (pode ser enviado junto com imagem ou vídeo)
        if (document) {
            messageData.document = typeof document === 'string' ? { url: document } : document;
        }

        // Envia a mensagem
        const result = await session.sendMessage(messageData);
        
        // Determina o tipo de mídia para a mensagem de sucesso
        let mediaType = '';
        if (video) mediaType = 'Vídeo';
        else if (image) mediaType = 'Imagem';
        else if (document) mediaType = 'Documento';
        
        res.json({
            success: true,
            data: result,
            message: mediaType 
                ? `${mediaType} enviado com sucesso` 
                : "Mensagem enviada com sucesso"
        });

    } catch (error) {
        console.error('Erro no controlador ao enviar mensagem:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Falha ao processar a requisição"
        });
    }
};