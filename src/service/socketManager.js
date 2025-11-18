// socketManager.js
import { makeWASocket, Browsers, useMultiFileAuthState, fetchLatestWaWebVersion, DisconnectReason, delay } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import logger from "./logger.js";
import qrcodeBase64 from "qrcode";
import fs from 'fs/promises';
import path from 'path';

const CONNECTION_TYPE = "QR";
const USE_LATEST_VERSION = true;

export class WhatsAppSocket {
    constructor(sessionId) {
        if (!sessionId) {
            throw new Error("Session ID is required");
        }
        this.sessionId = sessionId;
        this.authDir = path.join('sessions', this.sessionId);
        this.sock = null;
        this.isConnected = false;
        this.isInitializing = false;
        this.currentQR = null;
        this.qrCodeBase64 = null;
        this.reconnectTimeout = null;
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 0; // 0 = ilimitado
        this.lastQRTime = null;
        this.qrRefreshInterval = null;
        this.autoReconnect = true; // ✅ SEMPRE reconectar
        this.connectionState = 'disconnected'; // disconnected, connecting, connected
        this.qrPromise = null;
    }

    async getQrCode() {
        if (!this.currentQR) {
            throw new Error("QR Code não disponível no momento");
        }

        try {
            this.qrCodeBase64 = await qrcodeBase64.toDataURL(this.currentQR);
            return this.qrCodeBase64;
        } catch (error) {
            throw new Error(`Erro ao gerar QR Code: ${error.message}`);
        }
    }

    waitForQrCode() {
        // Se já temos um QR, retorna imediatamente
        if (this.hasPendingQR()) {
            return Promise.resolve(this.currentQR);
        }

        // Se uma promise já existe, retorna ela
        if (this.qrPromise) {
            return this.qrPromise.promise;
        }

        // Cria uma nova promise com um timeout
        const newPromise = {};
        newPromise.promise = new Promise((resolve, reject) => {
            newPromise.resolve = resolve;

            // Timeout para evitar que a requisição fique presa para sempre
            setTimeout(() => {
                if (this.qrPromise === newPromise) { // Garante que não estamos rejeitando uma promise já resolvida
                    this.qrPromise = null;
                    reject(new Error("Timeout: QR Code não gerado em 30 segundos."));
                }
            }, 30000); // 30 segundos de timeout
        });

        this.qrPromise = newPromise;
        return this.qrPromise.promise;
    }

    hasPendingQR() {
        return !this.isConnected && this.currentQR !== null;
    }

    // ✅ MÉTODO MELHORADO: Disconnect sem parar auto-reconexão
    async disconnect() {
        logger.info("🛑 Iniciando desconexão...");

        // Limpa todos os timeouts e intervals
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.qrRefreshInterval) {
            clearInterval(this.qrRefreshInterval);
            this.qrRefreshInterval = null;
        }

        // Fecha a conexão do socket
        if (this.sock) {
            try {
                await this.sock.logout();
                logger.info("✅ Logout realizado no servidor WhatsApp");
            } catch (error) {
                logger.warn("⚠️ Não foi possível fazer logout no servidor:", error.message);
            }

            try {
                await this.sock.end();
                logger.info("✅ Conexão do socket fechada");
            } catch (error) {
                logger.error("❌ Erro ao fechar socket:", error);
            }

            this.sock = null;
        }

        // Limpa o estado MAS MANTÉM autoReconnect = true
        this.isConnected = false;
        this.isInitializing = false;
        this.currentQR = null;
        this.qrCodeBase64 = null;
        this.connectionState = 'disconnected';

        logger.info("✅ Desconexão concluída - reiniciando em 3 segundos...");

        // ✅ SEMPRE reinicia após disconnect
        setTimeout(() => {
            this.init();
        }, 3000);
    }

    // ✅ MÉTODO PARA FORÇAR NOVA GERAÇÃO DE QR CODE
    async forceNewQR() {
        logger.info("🔄 Forçando geração de novo QR Code...");

        if (this.sock && !this.isConnected) {
            try {
                await this.sock.end();
                this.sock = null;
            } catch (error) {
                // Ignora erros de fechamento
            }
        }

        this.currentQR = null;
        this.qrCodeBase64 = null;
        this.isInitializing = false;

        // Pequeno delay antes de reiniciar
        setTimeout(() => {
            this.init();
        }, 1000);
    }

    async deleteAuth() {
        try {
            const authDir = this.authDir;

            try {
                await fs.access(authDir);
            } catch {
                logger.info("📁 Pasta de autenticação não existe");
                return;
            }

            const files = await fs.readdir(authDir);

            for (const file of files) {
                const filePath = path.join(authDir, file);
                await fs.unlink(filePath);
                logger.info(`🗑️  Arquivo removido: ${file}`);
            }

            await fs.rm(authDir, { recursive: true, force: true });
            logger.info('🧹 Pasta de autenticação removida completamente');

        } catch (error) {
            logger.error('❌ Erro ao remover autenticação:', error);
            throw error;
        }
    }

    // ✅ MÉTODO PRINCIPAL MELHORADO - SEMPRE DISPONIBILIZA QR CODE
    async init() {
        // Previne múltiplas inicializações simultâneas
        if (this.isInitializing) {
            logger.info("⏳ Inicialização já em andamento...");
            return;
        }

        if (this.isConnected && this.sock) {
            logger.info("✅ Socket já está conectado");
            return;
        }

        this.isInitializing = true;
        this.connectionState = 'connecting';
        this.connectionAttempts++;

        logger.info(`🔄 Iniciando conexão WhatsApp (tentativa ${this.connectionAttempts})`);

        try {
            const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
            const { version } = await fetchLatestWaWebVersion();

            if (USE_LATEST_VERSION) {
                logger.info(`📱 Usando versão do WhatsApp Web: ${version.join('.')}`);
            }

            // ✅ CONFIGURAÇÕES OTIMIZADAS PARA ESTABILIDADE
            this.sock = makeWASocket({
                auth: state,
                browser: Browsers.appropriate("Desktop"),
                printQRInTerminal: true,
                version: USE_LATEST_VERSION ? version : undefined,
                defaultQueryTimeoutMs: 60000,
                markOnlineOnConnect: false,
                syncFullHistory: false,
                connectTimeoutMs: 30000,
                keepAliveIntervalMs: 10000,
                maxRetries: 5,
                emitOwnEvents: true,
                generateHighQualityLinkPreview: false,
                // ✅ CONFIGURAÇÕES PARA EVITAR CONFLITOS
                shouldIgnoreJid: (jid) => jid?.endsWith('@g.us') || jid?.endsWith('@broadcast'),
                msgRetryCounterMap: {},
                getMessage: async () => undefined,
                // ✅ MAIS ESTÁVEL
                fireInitQueries: true,
                transactionOpts: {
                    maxRetries: 3,
                    delayInMs: 1000
                }
            });

            // Salva credenciais quando atualizadas
            this.sock.ev.on('creds.update', saveCreds);

            // ✅ EVENT HANDLER MELHORADO
            this.sock.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect, qr, isNewLogin, receivedPendingNotifications } = update;

                logger.info(`📊 Estado da Conexão: ${connection}`);

                // ✅ SEMPRE gerar QR Code quando disponível
                if (qr) {
                    // Resolve a promise pendente do QR Code
                    if (this.qrPromise && this.qrPromise.resolve) {
                        this.qrPromise.resolve(qr);
                        this.qrPromise = null; // Limpa a promise após o uso
                    }
                    logger.info("📱 NOVO QR Code gerado - Disponível para escaneamento");
                    this.currentQR = qr;
                    this.lastQRTime = Date.now();

                    // Gera QR no terminal
                    qrcode.generate(qr, { small: true });

                    // Gera base64 para API
                    try {
                        this.qrCodeBase64 = await qrcodeBase64.toDataURL(qr);
                        logger.info("✅ QR Code em base64 gerado com sucesso");
                    } catch (error) {
                        logger.error("❌ Erro ao gerar QR Code base64:", error);
                    }

                    // ✅ AUTO-REFRESH do QR Code a cada 45 segundos
                    if (this.qrRefreshInterval) {
                        clearInterval(this.qrRefreshInterval);
                    }

                    this.qrRefreshInterval = setInterval(() => {
                        if (!this.isConnected && this.currentQR) {
                            const qrAge = Date.now() - this.lastQRTime;
                            if (qrAge > 45000) { // 45 segundos
                                logger.info("🔄 QR Code expirado - gerando novo automaticamente...");
                                this.forceNewQR();
                            }
                        }
                    }, 10000); // Verifica a cada 10 segundos
                }

                switch (connection) {
                    case "open":
                        this.isConnected = true;
                        this.isInitializing = false;
                        this.connectionState = 'connected';
                        this.connectionAttempts = 0;

                        if (this.qrRefreshInterval) {
                            clearInterval(this.qrRefreshInterval);
                            this.qrRefreshInterval = null;
                        }

                        logger.info("✅ CONECTADO COM SUCESSO AO WHATSAPP!");
                        break;

                    case "close":
                        this.isConnected = false;
                        this.isInitializing = false;
                        this.connectionState = 'disconnected';

                        if (this.qrRefreshInterval) {
                            clearInterval(this.qrRefreshInterval);
                            this.qrRefreshInterval = null;
                        }

                        const error = lastDisconnect?.error;
                        const statusCode = error?.output?.statusCode;

                        logger.error(`❌ Conexão fechada: ${statusCode || 'Unknown'}`);

                        // ✅ LÓGICA DE RECONEXÃO AUTOMÁTICA SEMPRE ATIVA
                        if (statusCode === DisconnectReason.loggedOut) {
                            logger.error("🔒 Logout detectado - limpando credenciais...");
                            await this.deleteAuth();
                        }

                        // ✅ SEMPRE tenta reconectar, independente do motivo
                        if (this.autoReconnect) {
                            const delayTime = Math.min(2000 * Math.pow(1.5, this.connectionAttempts), 30000);
                            logger.info(`🔄 Reconectando automaticamente em ${delayTime / 1000} segundos...`);

                            this.reconnectTimeout = setTimeout(() => {
                                this.reconnectTimeout = null;
                                this.init();
                            }, delayTime);
                        }
                        break;

                    case "connecting":
                        logger.info("🔄 Conectando ao WhatsApp...");
                        this.connectionState = 'connecting';
                        break;
                }
            });

            // ✅ EVENTOS ADICIONAIS PARA MELHOR CONTROLE
            this.sock.ev.on("creds.update", () => {
                logger.info("🔑 Credenciais atualizadas");
            });

            this.sock.ev.on("messages.upsert", () => {
                // Mantém a conexão ativa
            });

        } catch (error) {
            this.isInitializing = false;
            this.connectionState = 'disconnected';
            logger.error("💥 Erro crítico na inicialização:", error);

            // ✅ SEMPRE tenta novamente em caso de erro
            if (this.autoReconnect) {
                const delayTime = Math.min(5000 * this.connectionAttempts, 30000);
                logger.info(`🔄 Tentando novamente em ${delayTime / 1000} segundos...`);

                this.reconnectTimeout = setTimeout(() => {
                    this.reconnectTimeout = null;
                    this.init();
                }, delayTime);
            }
        }
    }

    // ✅ MÉTODO PARA ATIVAR/DESATIVAR AUTO-RECONEXÃO
    setAutoReconnect(enabled) {
        this.autoReconnect = enabled;
        logger.info(`🔄 Auto-reconexão ${enabled ? 'ativada' : 'desativada'}`);
    }

    // ✅ MÉTODO PARA ENVIAR MENSAGENS
    async sendMessage({ number, text, image, video, document }) {
        if (!this.sock || !this.isConnected) {
            throw new Error("WhatsApp não está conectado");
        }

        // Verifica se o número foi fornecido
        if (!number) {
            throw new Error("Número de telefone é obrigatório");
        }

        const jid = number.includes('@s.whatsapp.net')
            ? number
            : `${number}@s.whatsapp.net`;

        try {
            // Função auxiliar para processar mídia
            const processMedia = (media, type) => {
                if (!media) return null;
                
                const options = {
                    mimetype: media.mimetype || 
                        (type === 'image' ? 'image/jpeg' : 
                         type === 'video' ? 'video/mp4' : 
                         'application/octet-stream'),
                    caption: text || media.caption || ''
                };

                // Define o nome do arquivo padrão
                if (media.fileName) {
                    options.fileName = media.fileName;
                } else if (type === 'document') {
                    options.fileName = 'documento';
                } else if (type === 'video') {
                    options.fileName = 'video.mp4';
                } else if (type === 'image') {
                    options.fileName = 'imagem.jpg';
                }

                // Se for uma URL
                if (media.url) {
                    console.log(`Enviando ${type} por URL:`, media.url);
                    return { [type]: { url: media.url }, ...options };
                }
                // Se for base64
                else if (media.base64) {
                    console.log(`Enviando ${type} em base64`);
                    const fileBuffer = Buffer.from(
                        media.base64.replace(/^data:\w+\/\w+;base64,/, ''),
                        'base64'
                    );
                    return { [type]: fileBuffer, ...options };
                }
                // Se for um buffer
                else if (media.buffer) {
                    console.log(`Enviando ${type} a partir de buffer`);
                    return { [type]: media.buffer, ...options };
                }
                
                throw new Error(`Formato de ${type} não suportado`);
            };

            // Se tiver vídeo, envia como mensagem de vídeo
            if (video) {
                console.log('Enviando vídeo:', video);
                const videoMessage = processMedia(video, 'video');
                return await this.sock.sendMessage(jid, videoMessage);
            }
            // Se tiver imagem, envia como mensagem de imagem
            else if (image) {
                console.log('Enviando imagem:', image);
                const imageMessage = processMedia(image, 'image');
                return await this.sock.sendMessage(jid, imageMessage);
            }
            // Se tiver documento, envia como mensagem de documento
            else if (document) {
                console.log('Enviando documento:', document);
                const docMessage = processMedia(document, 'document');
                return await this.sock.sendMessage(jid, docMessage);
            }

            // Se não tiver mídia, envia apenas texto
            if (text) {
                return await this.sock.sendMessage(jid, { text });
            }

            throw new Error('Nenhum conteúdo para enviar');
            
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            throw error;
        }
    }


    // ✅ Fechar conexão completamente (sem auto-reconexão)
    async close() {
        this.autoReconnect = false;
        await this.disconnect();
    }

    // ✅ Status detalhado
    getDetailedStatus() {
        return {
            isConnected: this.isConnected,
            isInitializing: this.isInitializing,
            connectionState: this.connectionState,
            hasPendingQR: this.hasPendingQR(),
            connectionAttempts: this.connectionAttempts,
            autoReconnect: this.autoReconnect,
            lastQRTime: this.lastQRTime,
            qrAge: this.lastQRTime ? Date.now() - this.lastQRTime : null
        };
    }
}

