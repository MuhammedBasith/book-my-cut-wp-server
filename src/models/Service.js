import { ObjectId } from 'mongodb';

export class Service {
  constructor({
    _id = new ObjectId(),
    category,
    serviceId,
    title,
    description,
    duration,
    price,
    isActive = true,
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this._id = _id;
    this.category = category;
    this.serviceId = serviceId;
    this.title = title;
    this.description = description;
    this.duration = duration;
    this.price = price;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static getCollection(db) {
    return db.collection('services');
  }

  static async createIndexes(db) {
    const collection = this.getCollection(db);
    await collection.createIndex({ serviceId: 1 }, { unique: true });
    await collection.createIndex({ category: 1 });
    await collection.createIndex({ isActive: 1 });
  }
}