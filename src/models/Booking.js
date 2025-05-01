import { ObjectId } from 'mongodb';

export class Booking {
  constructor({
    _id = new ObjectId(),
    customerId,
    serviceId,
    status = 'CONFIRMED', // CONFIRMED, CANCELLED, COMPLETED, PAID
    paymentStatus = 'PENDING', // PENDING, PAID
    appointmentDate,
    appointmentTime,
    bookingReference = generateBookingReference(),
    loyaltyPointsAwarded = false,
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this._id = _id;
    this.customerId = customerId;
    this.serviceId = serviceId;
    this.status = status;
    this.paymentStatus = paymentStatus;
    this.appointmentDate = appointmentDate;
    this.appointmentTime = appointmentTime;
    this.bookingReference = bookingReference;
    this.loyaltyPointsAwarded = loyaltyPointsAwarded;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static getCollection(db) {
    return db.collection('bookings');
  }

  static async createIndexes(db) {
    const collection = this.getCollection(db);
    await collection.createIndex({ customerId: 1 });
    await collection.createIndex({ serviceId: 1 });
    await collection.createIndex({ appointmentDate: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ paymentStatus: 1 });
    await collection.createIndex({ bookingReference: 1 }, { unique: true });
  }
}

function generateBookingReference() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `BMC-${timestamp}-${random}`;
}