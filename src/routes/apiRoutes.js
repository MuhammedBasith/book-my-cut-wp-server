import express from 'express';
import { databaseService } from '../services/databaseService.js';
import { ObjectId } from 'mongodb';
import { Service } from '../models/Service.js';
import { Booking } from '../models/Booking.js';
import { Customer } from '../models/Customer.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Bookings endpoints
router.get('/salon/:salonId/bookings', async (req, res) => {
  try {
    const db = databaseService.getDb();
    const bookings = await Booking.getCollection(db)
      .aggregate([
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer'
          }
        },
        {
          $lookup: {
            from: 'services',
            localField: 'serviceId',
            foreignField: '_id',
            as: 'service'
          }
        },
        {
          $unwind: '$customer'
        },
        {
          $unwind: '$service'
        }
      ])
      .toArray();

    res.json(bookings);
  } catch (error) {
    logger.error('Failed to fetch bookings', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

router.get('/salon/:salonId/bookings/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const db = databaseService.getDb();
    const bookings = await Booking.getCollection(db)
      .aggregate([
        {
          $match: {
            appointmentDate: {
              $gte: today,
              $lt: tomorrow
            }
          }
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer'
          }
        },
        {
          $lookup: {
            from: 'services',
            localField: 'serviceId',
            foreignField: '_id',
            as: 'service'
          }
        },
        {
          $unwind: '$customer'
        },
        {
          $unwind: '$service'
        }
      ])
      .toArray();

    res.json(bookings);
  } catch (error) {
    logger.error('Failed to fetch today\'s bookings', error);
    res.status(500).json({ error: 'Failed to fetch today\'s bookings' });
  }
});

// Update booking status and handle loyalty points
router.patch('/bookings/:bookingId/status', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, paymentStatus } = req.body;
    
    if (!status && !paymentStatus) {
      return res.status(400).json({ error: 'Either status or paymentStatus must be provided' });
    }

    const db = databaseService.getDb();
    const bookingCollection = Booking.getCollection(db);
    const customerCollection = Customer.getCollection(db);
    const serviceCollection = Service.getCollection(db);

    // Get the booking
    const booking = await bookingCollection.findOne({ _id: new ObjectId(bookingId) });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    updateData.updatedAt = new Date();

    // If payment is being marked as PAID and points haven't been awarded yet
    if (paymentStatus === 'PAID' && !booking.loyaltyPointsAwarded) {
      const service = await serviceCollection.findOne({ _id: new ObjectId(booking.serviceId) });
      if (service && service.loyaltyPoints > 0) {
        await customerCollection.updateOne(
          { _id: new ObjectId(booking.customerId) },
          { 
            $inc: { loyaltyPoints: service.loyaltyPoints },
            $set: { updatedAt: new Date() }
          }
        );
        updateData.loyaltyPointsAwarded = true;
      }
    }

    // Update the booking
    const result = await bookingCollection.findOneAndUpdate(
      { _id: new ObjectId(bookingId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to update booking status', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// Services endpoints
router.get('/salon/:salonId/services', async (req, res) => {
  try {
    const db = databaseService.getDb();
    const services = await Service.getCollection(db).find({}).toArray();
    res.json(services);
  } catch (error) {
    logger.error('Failed to fetch services', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

router.patch('/services/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdAt;
    updates.updatedAt = new Date();

    const db = databaseService.getDb();
    const result = await Service.getCollection(db).findOneAndUpdate(
      { _id: new ObjectId(serviceId) },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(result);
  } catch (error) {
    logger.error('Failed to update service', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

router.post('/salon/:salonId/services', async (req, res) => {
  try {
    const service = new Service(req.body);
    const db = databaseService.getDb();
    await Service.getCollection(db).insertOne(service);
    res.status(201).json(service);
  } catch (error) {
    logger.error('Failed to create service', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Customers endpoints
router.get('/salon/:salonId/customers', async (req, res) => {
  try {
    const db = databaseService.getDb();
    const customers = await Customer.getCollection(db).find({}).toArray();
    res.json(customers);
  } catch (error) {
    logger.error('Failed to fetch customers', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

export default router;