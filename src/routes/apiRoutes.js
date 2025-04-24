import express from 'express';

const router = express.Router();

// Bookings endpoints
router.get('/salon/:salonId/bookings', (req, res) => {
  // TODO: Implement when MongoDB is integrated
  res.json({ message: 'List all bookings for salon' });
});

router.get('/salon/:salonId/bookings/today', (req, res) => {
  // TODO: Implement when MongoDB is integrated
  res.json({ message: 'List today\'s bookings for salon' });
});

router.get('/customer/:customerId/bookings', (req, res) => {
  // TODO: Implement when MongoDB is integrated
  res.json({ message: 'List customer bookings' });
});

// Services endpoints
router.get('/salon/:salonId/services', (req, res) => {
  // TODO: Implement when MongoDB is integrated
  res.json({ message: 'List salon services' });
});

router.post('/salon/:salonId/services', (req, res) => {
  // TODO: Implement when MongoDB is integrated
  res.json({ message: 'Create new salon service' });
});

// Customers endpoints
router.get('/salon/:salonId/customers', (req, res) => {
  // TODO: Implement when MongoDB is integrated
  res.json({ message: 'List salon customers' });
});

export default router;