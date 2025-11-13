// server.js
import express from "express";
import { whatsAppSocket } from "../socketManager.js";
import logger from "../logger.js";

const app = express();

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

// ✅ ATUALIZE A LISTA DE ENDPOINTS NO console.log
app.listen(3000, async () => {
    console.log("🚀 Server is running on port 3000");
    console.log("📱 ENDPOINTS PRINCIPAIS:");
    console.log("   GET    http://localhost:3000/status");
    console.log("   GET    http://localhost:3000/qrcode");
    console.log("   POST   http://localhost:3000/send-message");
    console.log("   POST   http://localhost:3000/disconnect");

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