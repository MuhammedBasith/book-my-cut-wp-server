import { logger } from '../utils/logger.js';

class SessionService {
  constructor() {
    this.sessions = new Map();
  }

  getSession(phoneNumber) {
    return this.sessions.get(phoneNumber) || null;
  }

  createSession(phoneNumber, userName) {
    const session = {
      phoneNumber,
      userName,
      step: 'initial',
      selectedService: null,
      selectedDate: null,
      selectedTime: null,
      createdAt: new Date()
    };
    this.sessions.set(phoneNumber, session);
    logger.info('Session created', { phoneNumber });
    return session;
  }

  updateSession(phoneNumber, updates) {
    const session = this.getSession(phoneNumber);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const updatedSession = { ...session, ...updates };
    this.sessions.set(phoneNumber, updatedSession);
    logger.info('Session updated', { phoneNumber, updates });
    return updatedSession;
  }

  clearSession(phoneNumber) {
    this.sessions.delete(phoneNumber);
    logger.info('Session cleared', { phoneNumber });
  }
}

export const sessionService = new SessionService();