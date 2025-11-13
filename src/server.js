// server.js
import express from "express";
import { whatsAppSocket } from "../socketManager.js";
import logger from "../logger.js";
import multer from "multer";
import fs from "fs";
import csv from "csv-parser";
import path from "path";

const app = express();

// ✅ CONFIGURAÇÃO DO MULTER PARA UPLOAD DE ARQUIVOS
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadsDir = './uploads';
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
        }
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Nome único para o arquivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'contacts-' + uniqueSuffix + '.csv');
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Aceita apenas arquivos CSV
        if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos CSV são permitidos'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limite
    }
});

// Middleware para CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json({ limit: '10mb' }));
let contacts = [];


// Middleware para CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json({ limit: '10mb' }));

// ✅ ENDPOINT PARA UPLOAD DE CSV
app.post("/upload-contacts", upload.single('csvfile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "Nenhum arquivo foi enviado"
            });
        }

        const results = [];
        const errors = [];

        // Lê o arquivo CSV
        fs.createReadStream(req.file.path)
            .pipe(csv({
                mapHeaders: ({ header }) => header.trim().toLowerCase(),
                separator: ',' // Pode ajustar para ';' se necessário
            }))
            .on('data', (data) => {
                // Verifica se as colunas necessárias existem
                if (data.nome && data.telefone) {
                    // Formata o telefone: remove caracteres não numéricos
                    const phone = data.telefone.replace(/\D/g, '');

                    // Validação básica do telefone
                    if (phone.length >= 10 && phone.length <= 13) {
                        results.push({
                            nome: data.nome.trim(),
                            telefone: phone,
                            id: results.length + 1
                        });
                    } else {
                        errors.push(`Telefone inválido: ${data.telefone} para ${data.nome}`);
                    }
                } else {
                    errors.push(`Linha inválida: nome ou telefone faltando - ${JSON.stringify(data)}`);
                }
            })
            .on('end', () => {
                // Remove o arquivo após a leitura
                fs.unlinkSync(req.file.path);

                // Atualiza a lista de contatos
                contactsList = results;

                logger.info(`📊 CSV processado: ${results.length} contatos importados`);

                res.json({
                    success: true,
                    message: `CSV processado com sucesso! ${results.length} contatos importados.`,
                    totalContacts: results.length,
                    errors: errors.length > 0 ? errors : undefined,
                    contacts: results.slice(0, 10) // Retorna apenas os primeiros 10 para preview
                });
            })
            .on('error', (error) => {
                // Remove o arquivo em caso de erro
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                res.status(500).json({
                    success: false,
                    error: "Erro ao processar o arquivo CSV",
                    details: error.message
                });
            });

    } catch (error) {
        logger.error("❌ Erro no upload de contatos:", error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Falha no processamento do arquivo"
        });
    }
});

// ✅ ENDPOINT PARA LISTAR CONTATOS
app.get("/contacts", (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = pageNum * limitNum;

        const paginatedContacts = contactsList.slice(startIndex, endIndex);

        res.json({
            success: true,
            contacts: paginatedContacts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: contactsList.length,
                pages: Math.ceil(contactsList.length / limitNum)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ ENDPOINT PARA ENVIAR MENSAGEM EM MASSA
app.post("/send-bulk-message", express.json(), async (req, res) => {
    try {
        const { message, delayBetweenMessages = 120000 } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: "Mensagem é obrigatória"
            });
        }

        if (!whatsAppSocket.isConnected) {
            return res.status(400).json({
                success: false,
                error: "WhatsApp não está conectado",
                message: "Conecte o WhatsApp via QR Code antes de enviar mensagens"
            });
        }

        if (contactsList.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Nenhum contato carregado",
                message: "Use /upload-contacts para carregar uma lista de contatos primeiro"
            });
        }

        logger.info(`🚀 Iniciando envio em massa para ${contactsList.length} contatos`);

        const results = [];
        const errors = [];

        // Envia mensagens com delay entre elas
        for (let i = 0; i < contactsList.length; i++) {
            const contact = contactsList[i];

            try {
                logger.info(`📤 Enviando para ${contact.nome} (${i + 1}/${contactsList.length})`);

                const result = await whatsAppSocket.sendMessage(contact.telefone, message);

                results.push({
                    id: contact.id,
                    nome: contact.nome,
                    telefone: contact.telefone,
                    success: true,
                    messageId: result.key.id,
                    timestamp: new Date().toISOString()
                });

                // Progresso a cada 10 mensagens
                if ((i + 1) % 10 === 0) {
                    logger.info(`📊 Progresso: ${i + 1}/${contactsList.length} mensagens enviadas`);
                }

                // Delay entre mensagens para evitar bloqueio
                if (i < contactsList.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, parseInt(delayBetweenMessages)));
                }

            } catch (error) {
                logger.error(`❌ Erro ao enviar para ${contact.nome}:`, error.message);

                errors.push({
                    id: contact.id,
                    nome: contact.nome,
                    telefone: contact.telefone,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });

                // Delay mesmo em caso de erro
                if (i < contactsList.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, parseInt(delayBetweenMessages)));
                }
            }
        }

        const summary = {
            total: contactsList.length,
            successful: results.length,
            failed: errors.length,
            successRate: ((results.length / contactsList.length) * 100).toFixed(2) + '%'
        };

        logger.info(`✅ Envio em massa concluído: ${summary.successful}/${summary.total} enviadas com sucesso`);

        res.json({
            success: true,
            summary,
            results: results.slice(0, 50), // Retorna apenas as primeiras 50 para não sobrecarregar
            errors: errors.slice(0, 50),
            message: `Envio em massa concluído! ${summary.successful} de ${summary.total} mensagens enviadas com sucesso.`
        });

    } catch (error) {
        logger.error("💥 Erro no envio em massa:", error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Falha no envio em massa"
        });
    }
});

// ✅ ENDPOINT PARA ENVIAR PARA CONTATOS ESPECÍFICOS
app.post("/send-to-selected", express.json(), async (req, res) => {
    try {
        const { contactIds, message, delayBetweenMessages = 2000 } = req.body;

        if (!message || !contactIds || !Array.isArray(contactIds)) {
            return res.status(400).json({
                success: false,
                error: "Mensagem e lista de IDs de contatos são obrigatórios"
            });
        }

        if (!whatsAppSocket.isConnected) {
            return res.status(400).json({
                success: false,
                error: "WhatsApp não está conectado"
            });
        }

        // Filtra os contatos selecionados
        const selectedContacts = contactsList.filter(contact =>
            contactIds.includes(contact.id)
        );

        if (selectedContacts.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Nenhum contato válido encontrado para os IDs fornecidos"
            });
        }

        logger.info(`🎯 Enviando para ${selectedContacts.length} contatos selecionados`);

        const results = [];
        const errors = [];

        for (let i = 0; i < selectedContacts.length; i++) {
            const contact = selectedContacts[i];

            try {
                const result = await whatsAppSocket.sendMessage(contact.telefone, message);

                results.push({
                    id: contact.id,
                    nome: contact.nome,
                    telefone: contact.telefone,
                    success: true,
                    messageId: result.key.id
                });

                // Delay entre mensagens
                if (i < selectedContacts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, parseInt(delayBetweenMessages)));
                }

            } catch (error) {
                errors.push({
                    id: contact.id,
                    nome: contact.nome,
                    telefone: contact.telefone,
                    success: false,
                    error: error.message
                });

                // Delay mesmo em caso de erro
                if (i < selectedContacts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, parseInt(delayBetweenMessages)));
                }
            }
        }

        res.json({
            success: true,
            summary: {
                total: selectedContacts.length,
                successful: results.length,
                failed: errors.length
            },
            results,
            errors
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ ENDPOINT PARA LIMPAR LISTA DE CONTATOS
app.delete("/contacts", (req, res) => {
    const previousCount = contactsList.length;
    contactsList = [];

    logger.info(`🧹 Lista de contatos limpa: ${previousCount} contatos removidos`);

    res.json({
        success: true,
        message: `Lista de contatos limpa com sucesso. ${previousCount} contatos removidos.`
    });
});

// ✅ ENDPOINT PARA DOWNLOAD DO TEMPLATE CSV
app.get("/download-template", (req, res) => {
    const template = `nome,telefone\nJoão Silva,5511999999999\nMaria Santos,5511888888888\nPedro Costa,5511777777777`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=template-contatos.csv');
    res.send(template);
});

// ✅ ENDPOINT PRINCIPAL - SEMPRE RETORNA QR CODE SE DISPONÍVEL
app.get("/qrcode", async (req, res) => {
    try {
        // Se não há QR Code atual, força a geração de um novo
        if (!whatsAppSocket.hasPendingQR() && !whatsAppSocket.isConnected) {
            logger.info("🔄 Solicitando geração de novo QR Code...");
            await whatsAppSocket.forceNewQR();

            // Aguarda um pouco para o QR Code ser gerado
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (!whatsAppSocket.hasPendingQR()) {
            if (whatsAppSocket.isConnected) {
                return res.json({
                    success: true,
                    status: "connected",
                    message: "WhatsApp já está conectado",
                    connected: true
                });
            } else {
                return res.status(202).json({
                    success: false,
                    status: "generating",
                    message: "QR Code sendo gerado, tente novamente em alguns segundos",
                    connected: false
                });
            }
        }

        const qrCode = await whatsAppSocket.getQrCode();
        res.json({
            success: true,
            qrCode,
            status: "ready",
            message: "Escaneie este QR Code no WhatsApp",
            timestamp: Date.now(),
            connected: false
        });
    } catch (error) {
        logger.error("❌ Erro no endpoint /qrcode:", error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Erro ao gerar QR Code"
        });
    }
});

// ✅ ENDPOINT DE STATUS DETALHADO
app.get("/status", (req, res) => {
    const detailedStatus = whatsAppSocket.getDetailedStatus();

    res.json({
        success: true,
        ...detailedStatus,
        status: whatsAppSocket.isConnected ? "connected" : "disconnected",
        message: whatsAppSocket.isConnected ?
            "WhatsApp conectado com sucesso" :
            "WhatsApp desconectado - QR Code disponível em /qrcode"
    });
});

// ✅ ENDPOINT PARA FORÇAR NOVO QR CODE
app.post("/qrcode/refresh", async (req, res) => {
    try {
        logger.info("🔄 Refresh manual do QR Code solicitado");

        if (whatsAppSocket.isConnected) {
            return res.json({
                success: true,
                status: "connected",
                message: "Já está conectado, não é necessário refresh"
            });
        }

        await whatsAppSocket.forceNewQR();

        res.json({
            success: true,
            status: "refreshing",
            message: "Novo QR Code sendo gerado",
            nextSteps: "Acesse /qrcode em 3-5 segundos para obter o novo QR Code"
        });
    } catch (error) {
        logger.error("❌ Erro no refresh do QR Code:", error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Falha ao gerar novo QR Code"
        });
    }
});

// ✅ ENDPOINT DE DISCONNECT COM AUTO-RECONEXÃO
app.delete("/disconnect", async (req, res) => {
    try {
        logger.info("🛑 Recebida requisição de disconnect");

        // Mantém auto-reconexão ativa por padrão
        whatsAppSocket.setAutoReconnect(true);
        await whatsAppSocket.disconnect();

        res.json({
            success: true,
            message: "WhatsApp desconectado - reconexão automática ativada",
            nextSteps: "Novo QR Code estará disponível em segundos"
        });
    } catch (error) {
        logger.error("❌ Erro no endpoint de disconnect:", error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Falha ao desconectar WhatsApp"
        });
    }
});

// ✅ ENDPOINT PARA DESATIVAR AUTO-RECONEXÃO
app.post("/autoreconnect/disable", (req, res) => {
    whatsAppSocket.setAutoReconnect(false);
    res.json({
        success: true,
        message: "Auto-reconexão desativada",
        warning: "Após disconnect, será necessário reconectar manualmente"
    });
});

// ✅ ENDPOINT PARA ATIVAR AUTO-RECONEXÃO
app.post("/autoreconnect/enable", (req, res) => {
    whatsAppSocket.setAutoReconnect(true);
    res.json({
        success: true,
        message: "Auto-reconexão ativada",
        info: "O sistema irá automaticamente reconectar e gerar QR Codes"
    });
});

// ✅ ENDPOINT DE RESET COMPLETO
app.post("/reset", async (req, res) => {
    try {
        logger.info("🔄 Reset completo solicitado");

        whatsAppSocket.setAutoReconnect(true);
        await whatsAppSocket.disconnect();

        res.json({
            success: true,
            message: "Reset completo realizado",
            nextSteps: "Novo QR Code estará disponível em /qrcode"
        });
    } catch (error) {
        logger.error("❌ Erro no reset:", error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Falha ao resetar"
        });
    }
});

// ✅ ENDPOINT PARA ENVIAR MENSAGEM
app.post("/send-message", express.json(), async (req, res) => {
    try {
        if (!whatsAppSocket.isConnected) {
            return res.status(400).json({
                success: false,
                error: "WhatsApp não está conectado",
                message: "Conecte o WhatsApp via QR Code antes de enviar mensagens"
            });
        }

        const { number, message } = req.body;

        if (!number || !message) {
            return res.status(400).json({
                success: false,
                error: "Número e mensagem são obrigatórios"
            });
        }

        const result = await whatsAppSocket.sendMessage(number, message);
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
});

// ✅ HEALTH CHECK SIMPLES
app.get("/health", (req, res) => {
    res.json({
        success: true,
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "WhatsApp API - Auto QR Code"
    });
});

// ✅ ATUALIZE A LISTA DE ENDPOINTS NO console.log
app.listen(3000, async () => {
    console.log("🚀 Server is running on port 3000");
    console.log("📱 ENDPOINTS PRINCIPAIS:");
    console.log("   GET    http://localhost:3000/health");
    console.log("   GET    http://localhost:3000/status");
    console.log("   GET    http://localhost:3000/qrcode");
    console.log("   POST   http://localhost:3000/send-message");
    console.log("");
    console.log("📊 ENDPOINTS DE ENVIO EM MASSA:");
    console.log("   POST   http://localhost:3000/upload-contacts     ← Upload CSV");
    console.log("   GET    http://localhost:3000/contacts           ← Listar contatos");
    console.log("   POST   http://localhost:3000/send-bulk-message  ← Enviar para todos");
    console.log("   POST   http://localhost:3000/send-to-selected   ← Enviar para selecionados");
    console.log("   DELETE http://localhost:3000/contacts           ← Limpar lista");
    console.log("   GET    http://localhost:3000/download-template  ← Template CSV");

    // Inicializa o WhatsApp com delay
    setTimeout(async () => {
        await whatsAppSocket.init();
    }, 2000);
});

// ✅ SHUTDOWN GRACEFUL
process.on('SIGINT', async () => {
    console.log("\n🔴 Desativando auto-reconexão e fechando...");
    whatsAppSocket.setAutoReconnect(false);
    await whatsAppSocket.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log("\n🔴 Desativando auto-reconexão e fechando...");
    whatsAppSocket.setAutoReconnect(false);
    await whatsAppSocket.close();
    process.exit(0);
});

export default app;