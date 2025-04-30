import { ObjectId } from 'mongodb';

export class Session {
  constructor({
    _id = new ObjectId(),
    phoneNumber,
    userName,
    step = 'initial',
    selectedService = null,
    selectedDate = null,
    selectedTime = null,
    createdAt = new Date(),
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  }) {
    this._id = _id;
    this.phoneNumber = phoneNumber;
    this.userName = userName;
    this.step = step;
    this.selectedService = selectedService;
    this.selectedDate = selectedDate;
    this.selectedTime = selectedTime;
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
  }

  static getCollection(db) {
    return db.collection('sessions');
  }

  static async createIndexes(db) {
    const collection = this.getCollection(db);
    await collection.createIndex({ phoneNumber: 1 });
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
  }
}