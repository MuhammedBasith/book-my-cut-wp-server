import { logger } from '../utils/logger.js';
import { databaseService } from './databaseService.js';
import { Session } from '../models/Session.js';

class SessionService {
  async getSession(phoneNumber) {
    try {
      const db = databaseService.getDb();
      const session = await Session.getCollection(db).findOne({ phoneNumber });
      return session;
    } catch (error) {
      logger.error('Failed to get session', error);
      throw error;
    }
  }

  async createSession(phoneNumber, userName) {
    try {
      const db = databaseService.getDb();
      const session = new Session({
        phoneNumber,
        userName,
        step: 'initial',
        selectedService: null,
        selectedDate: null,
        selectedTime: null
      });

      await Session.getCollection(db).insertOne(session);
      logger.info('Session created', { phoneNumber });
      return session;
    } catch (error) {
      logger.error('Failed to create session', error);
      throw error;
    }
  }

  async updateSession(phoneNumber, updates) {
    try {
      const db = databaseService.getDb();
      const collection = Session.getCollection(db);
      
      const result = await collection.findOneAndUpdate(
        { phoneNumber },
        { 
          $set: { 
            ...updates,
            updatedAt: new Date()
          } 
        },
        { returnDocument: 'after' }
      );

      if (!result) {
        throw new Error('Session not found');
      }

      logger.info('Session updated', { phoneNumber, updates });
      return result;
    } catch (error) {
      logger.error('Failed to update session', error);
      throw error;
    }
  }

  async clearSession(phoneNumber) {
    try {
      const db = databaseService.getDb();
      await Session.getCollection(db).deleteOne({ phoneNumber });
      logger.info('Session cleared', { phoneNumber });
    } catch (error) {
      logger.error('Failed to clear session', error);
      throw error;
    }
  }
}

export const sessionService = new SessionService();