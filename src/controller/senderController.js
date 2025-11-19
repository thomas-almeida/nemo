import * as sessionManager from "../service/sessionManager.js";

export const sendMessage = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { number, messages } = req.body;
        
        // Validações iniciais
        if (!number) {
            return res.status(400).json({
                success: false,
                error: "Número é obrigatório"
            });
        }

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                success: false,
                error: "Array de mensagens é obrigatório"
            });
        }

        if (messages.length === 0) {
            return res.status(400).json({
                success: false,
                error: "O array de mensagens não pode estar vazio"
            });
        }

        // Valida se documentos têm nome de arquivo
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            if (msg.document) {
                if (typeof msg.document === 'string' || !msg.document.filename) {
                    return res.status(400).json({
                        success: false,
                        error: `A mensagem na posição ${i} precisa ter um nome de arquivo (filename) para o documento`,
                        example: {
                            message: "Mensagem opcional",
                            document: {
                                url: "https://exemplo.com/arquivo.pdf",
                                filename: "nome_do_arquivo.pdf"
                            }
                        }
                    });
                }
            }
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

        const results = [];
        const errors = [];

        // Envia as mensagens em ordem sequencial
        for (let i = 0; i < messages.length; i++) {
            const messageItem = messages[i];
            const { message, image, video, document } = messageItem;

            try {
                // Prepara os dados para envio com o número único
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
                    // Já validamos anteriormente que document é um objeto com filename
                    messageData.document = {
                        ...document,
                        url: document.url || document
                    };
                }

                // Envia a mensagem
                const result = await session.sendMessage(messageData);
                
                // Determina o tipo de mídia para a mensagem de sucesso
                let mediaType = '';
                if (video) mediaType = 'Vídeo';
                else if (image) mediaType = 'Imagem';
                else if (document) mediaType = 'Documento';
                
                results.push({
                    index: i,
                    success: true,
                    data: result,
                    message: mediaType 
                        ? `${mediaType} enviado com sucesso`
                        : "Mensagem enviada com sucesso"
                });

            } catch (messageError) {
                console.error(`Erro ao enviar mensagem ${i}:`, messageError);
                errors.push({
                    index: i,
                    error: messageError.message,
                    message: messageItem
                });
            }
        }

        // Retorna o resultado final
        const response = {
            success: errors.length === 0,
            totalMessages: messages.length,
            sentCount: results.length,
            errorCount: errors.length,
            results: results
        };

        // Adiciona os erros se houver
        if (errors.length > 0) {
            response.errors = errors;
        }

        res.json(response);

    } catch (error) {
        console.error('Erro no controlador ao enviar mensagens:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Falha ao processar a requisição"
        });
    }
};