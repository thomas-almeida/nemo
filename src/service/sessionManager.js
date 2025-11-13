import { WhatsAppSocket } from './socketManager.js';
import logger from './logger.js';

const sessions = new Map();

export const getSession = (sessionId) => {
    return sessions.get(sessionId);
}

export const createSession = async (sessionId) => {
    if (sessions.has(sessionId)) {
        logger.info(`↪️ Sessão \"${sessionId}\" já existe.`);
        return sessions.get(sessionId);
    }

    logger.info(`✨ Criando nova sessão para \"${sessionId}\"...`);
    const session = new WhatsAppSocket(sessionId);
    sessions.set(sessionId, session);

    // Inicia a conexão em segundo plano
    session.init();

    return session;
}

export const deleteSession = async (sessionId) => {
    const session = sessions.get(sessionId);
    if (!session) {
        logger.warn(`⚠️ Tentativa de deletar sessão inexistente: \"${sessionId}\"`);
        return false;
    }

    logger.info(`🗑️ Deletando sessão \"${sessionId}\"...`);
    await session.close(); // Desconecta e desativa a reconexão
    sessions.delete(sessionId);
    return true;
}

export const listSessions = () => {
    return Array.from(sessions.keys());
}
