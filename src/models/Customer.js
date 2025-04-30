import { ObjectId } from 'mongodb';

export class Customer {
  constructor({
    _id = new ObjectId(),
    phoneNumber,
    name,
    loyaltyPoints = 0,
    lastVisit = null,
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this._id = _id;
    this.phoneNumber = phoneNumber;
    this.name = name;
    this.loyaltyPoints = loyaltyPoints;
    this.lastVisit = lastVisit;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static getCollection(db) {
    return db.collection('customers');
  }

  static async createIndexes(db) {
    const collection = this.getCollection(db);
    await collection.createIndex({ phoneNumber: 1 }, { unique: true });
    await collection.createIndex({ lastVisit: 1 });
  }
}