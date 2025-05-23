import { MongoClient } from 'mongodb';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { Service } from '../models/Service.js';
import { Customer } from '../models/Customer.js';
import { Booking } from '../models/Booking.js';
import { Session } from '../models/Session.js';

class DatabaseService {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    try {
      if (this.client) return this.db;

      this.client = new MongoClient(config.mongodb.uri, config.mongodb.options);
      await this.client.connect();
      
      this.db = this.client.db(config.mongodb.dbName);
      logger.info('Successfully connected to MongoDB');
      
      // Initialize collections and create indexes
      await this.initializeCollections();
      
      return this.db;
    } catch (error) {
      logger.error('Failed to connect to MongoDB', error);
      throw error;
    }
  }

  async initializeCollections() {
    try {
      // Create indexes for all collections
      await Service.createIndexes(this.db);
      await Customer.createIndexes(this.db);
      await Booking.createIndexes(this.db);
      await Session.createIndexes(this.db);
      
      logger.info('Successfully initialized collections and created indexes');
    } catch (error) {
      logger.error('Failed to initialize collections', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        logger.info('Disconnected from MongoDB');
      }
    } catch (error) {
      logger.error('Error disconnecting from MongoDB', error);
      throw error;
    }
  }

  getDb() {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }
}

export const databaseService = new DatabaseService();