import { whatsappService } from '../services/whatsappService.js';
import { sessionService } from '../services/sessionService.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { GREETING_PATTERNS, MESSAGES } from '../constants/salon.js';
import { Customer } from '../models/Customer.js';
import { Booking } from '../models/Booking.js';
import { Service } from '../models/Service.js';
import { databaseService } from '../services/databaseService.js';

const TIME_RANGES = {
  morning: { start: 9, end: 12, label: 'Morning (9 AM - 12 PM)' },
  afternoon: { start: 12, end: 16, label: 'Afternoon (12 PM - 4 PM)' },
  evening: { start: 16, end: 21, label: 'Evening (4 PM - 9 PM)' }
};

const SLOT_DURATION = 30; // Duration in minutes

const checkAvailableSlots = async (selectedDate, serviceId) => {
  const db = databaseService.getDb();
  
  // Get start and end of selected date
  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all bookings for the selected date
  const existingBookings = await Booking.getCollection(db)
    .find({
      appointmentDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $nin: ['CANCELLED'] } // Exclude cancelled bookings
    })
    .toArray();

  // Create a map of booked time slots
  const bookedSlots = new Map();
  existingBookings.forEach(booking => {
    const [hour, minute] = booking.appointmentTime.split(':')[0].split('_');
    const timeKey = `${parseInt(hour)}_${minute || '00'}`;
    bookedSlots.set(timeKey, true);
  });

  return bookedSlots;
};

const generateTimeRangeOptions = (selectedDate) => {
  const now = new Date();
  const isToday = selectedDate && 
    selectedDate.getDate() === now.getDate() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getFullYear() === now.getFullYear();

  // Convert current time to IST (UTC+5:30)
  const currentHourIST = isToday ? (now.getUTCHours() + 5 + (now.getUTCMinutes() + 30) / 60) : 0;

  return [{
    title: "Available Time Slots",
    rows: Object.entries(TIME_RANGES)
      .filter(([_, range]) => !isToday || range.end > currentHourIST)
      .map(([id, range]) => ({
        id: `range_${id}`,
        title: range.label,
        description: 'Select to see available slots'
      }))
  }];
};

const generateTimeSlotsForRange = async (rangeId, selectedDate) => {
  const range = TIME_RANGES[rangeId.replace('range_', '')];
  if (!range) return [];

  const now = new Date();
  const isToday = selectedDate && 
    selectedDate.getDate() === now.getDate() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getFullYear() === now.getFullYear();

  // Convert current time to IST (UTC+5:30)
  const currentHourIST = isToday ? (now.getUTCHours() + 5 + (now.getUTCMinutes() + 30) / 60) : 0;
  
  // Get booked slots for the day
  const bookedSlots = await checkAvailableSlots(selectedDate);
  
  const slots = [];
  for (let h = range.start; h < range.end; h++) {
    // Skip past time slots for today
    if (isToday && h <= currentHourIST) continue;

    const hour = h < 12 ? `${h}` : `${h-12}`;
    const ampm = h < 12 ? 'AM' : 'PM';
    
    // For current hour, only show future 30-minute slot if applicable
    if (isToday && h === Math.ceil(currentHourIST)) {
      const currentMinutesIST = (now.getUTCMinutes() + 30) % 60;
      if (currentMinutesIST < 30 && !bookedSlots.has(`${h}_30`)) {
        slots.push({ id: `slot_${h}_30`, title: `${hour}:30 ${ampm}`, description: '30 minute slot' });
      }
      continue;
    }

    // Add available slots that aren't booked
    if (!bookedSlots.has(`${h}_00`)) {
      slots.push({ id: `slot_${h}_00`, title: `${hour}:00 ${ampm}`, description: '30 minute slot' });
    }
    if (!bookedSlots.has(`${h}_30`)) {
      slots.push({ id: `slot_${h}_30`, title: `${hour}:30 ${ampm}`, description: '30 minute slot' });
    }
  }

  return slots.length > 0 ? [{
    title: range.label,
    rows: slots
  }] : [];
};

const generateDateOptions = () => {
  const dates = [];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();

  // Generate next 7 days only
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayName = days[date.getDay()];
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const id = `date_${date.toISOString().split('T')[0]}`;
    
    dates.push({
      id,
      title: i === 0 ? `Today (${dateStr})` : 
             i === 1 ? `Tomorrow (${dateStr})` :
             `${dayName} (${dateStr})`,
      description: `Select for available time slots`
    });
  }

  return [{
    title: "Available Dates",
    rows: dates
  }];
};

export const handleIncomingMessage = async (req, res, next) => {
  try {
    logger.info("Incoming webhook message", { body: req.body });

    const entry = req.body.entry?.[0]?.changes?.[0]?.value;
    const message = entry?.messages?.[0];
    const contact = entry?.contacts?.[0];
    
    if (!message) {
      logger.info("No message in webhook payload");
      return res.sendStatus(200);
    }

    const phoneNumberId = entry?.metadata?.phone_number_id;
    if (!phoneNumberId) {
      throw new Error('Missing phone number ID in webhook payload');
    }

    const from = message.from;
    const userName = contact?.profile?.name || 'there';

    // Create or update customer record
    const db = databaseService.getDb();
    const customerCollection = Customer.getCollection(db);
    
    await customerCollection.updateOne(
      { phoneNumber: from },
      { 
        $set: { 
          name: userName,
          updatedAt: new Date()
        },
        $setOnInsert: {
          loyaltyPoints: 0,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    let session = await sessionService.getSession(from);

    // Handle interactive messages (button/list responses)
    if (message.type === 'interactive') {
      const response = message.interactive;
      const responseId = response.button_reply?.id || response.list_reply?.id;

      if (!session) {
        session = await sessionService.createSession(from, userName);
      }

      switch (responseId) {
        case 'choose_service':
          // Get services from MongoDB
          const servicesFromDb = await Service.getCollection(db).find({ isActive: true }).toArray();
          
          // Group services by category
          const servicesByCategory = servicesFromDb.reduce((acc, service) => {
            if (!acc[service.category]) {
              acc[service.category] = [];
            }
            acc[service.category].push(service);
            return acc;
          }, {});

          // Format sections for WhatsApp API
          const serviceSections = Object.entries(servicesByCategory).map(([category, services]) => ({
            title: category,
            rows: services.map(service => ({
              id: service.serviceId,
              title: service.title.substring(0, 24),
              description: service.description.substring(0, 72)
            }))
          })).slice(0, 10);

          await whatsappService.sendListMessage(
            phoneNumberId,
            from,
            'Our Services',
            MESSAGES.CHOOSE_SERVICE,
            serviceSections,
            message.id
          );
          await sessionService.updateSession(from, { step: 'selecting_service' });
          break;

        case 'my_reservations':
          await whatsappService.sendTextMessage(
            phoneNumberId,
            from,
            'Coming soon: You\'ll be able to view and manage your reservations here.',
            message.id
          );
          break;

        case 'loyalty_points':
          const customer = await customerCollection.findOne({ phoneNumber: from });
          if (!customer) {
            await whatsappService.sendTextMessage(
              phoneNumberId,
              from,
              'No loyalty points found. Book a service to start earning points! 🎁',
              message.id
            );
            break;
          }

          const recentBookings = await Booking.getCollection(db)
            .aggregate([
              {
                $match: {
                  customerId: customer._id,
                  paymentStatus: 'PAID',
                  loyaltyPointsAwarded: true
                }
              },
              {
                $lookup: {
                  from: 'services',
                  localField: 'serviceId',
                  foreignField: 'serviceId',
                  as: 'service'
                }
              },
              {
                $unwind: '$service'
              },
              {
                $sort: { createdAt: -1 }
              },
              {
                $limit: 5
              }
            ])
            .toArray();

          let pointsMessage = `💫 Your Current Points: ${customer.loyaltyPoints}\n\n`;
          
          if (recentBookings.length > 0) {
            pointsMessage += '📝 Recent Points History:\n';
            recentBookings.forEach(booking => {
              const date = booking.appointmentDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              });
              pointsMessage += `${date} - ${booking.service.title}: +${booking.service.loyaltyPoints} points\n`;
            });
          }

          pointsMessage += '\n💡 Points are awarded after service completion and payment.';

          await whatsappService.sendTextMessage(
            phoneNumberId,
            from,
            pointsMessage,
            message.id
          );
          break;

        default:
          if (session.step === 'selecting_service' && responseId.includes('_')) {
            const selectedService = await Service.getCollection(db).findOne({ 
              serviceId: responseId,
              isActive: true
            });

            if (selectedService) {
              await sessionService.updateSession(from, { 
                step: 'selecting_date',
                selectedService: selectedService
              });

              await whatsappService.sendListMessage(
                phoneNumberId,
                from,
                'Select Date',
                MESSAGES.CHOOSE_DATE,
                generateDateOptions(),
                message.id
              );
            }
          } else if (session.step === 'selecting_date' && responseId.startsWith('date_')) {
            const selectedDate = new Date(responseId.replace('date_', ''));
            await sessionService.updateSession(from, {
              step: 'selecting_time_range',
              selectedDate: selectedDate
            });

            await whatsappService.sendListMessage(
              phoneNumberId,
              from,
              'Select Time',
              'Choose a time range that works best for you:',
              generateTimeRangeOptions(selectedDate),
              message.id
            );
          } else if (session.step === 'selecting_time_range' && responseId.startsWith('range_')) {
            await sessionService.updateSession(from, {
              step: 'selecting_time',
              selectedTimeRange: responseId
            });

            const timeSlots = await generateTimeSlotsForRange(responseId, session.selectedDate);
            
            if (timeSlots.length === 0) {
              await whatsappService.sendTextMessage(
                phoneNumberId,
                from,
                'Sorry, no available time slots in this range. Please select a different time range or date.',
                message.id
              );
              return;
            }

            await whatsappService.sendListMessage(
              phoneNumberId,
              from,
              'Select Time',
              'Choose your preferred appointment time:',
              timeSlots,
              message.id
            );
          } else if (session.step === 'selecting_time' && responseId.startsWith('slot_')) {
            const timeSlots = await generateTimeSlotsForRange(session.selectedTimeRange, session.selectedDate);
            const availableSlots = timeSlots.flatMap(section => section.rows);
            const selectedSlot = availableSlots.find(slot => slot.id === responseId);

            if (selectedSlot) {
              // Double-check that the slot is still available
              const [hour, minute] = responseId.split('_').slice(1);
              const bookedSlots = await checkAvailableSlots(session.selectedDate);
              
              if (bookedSlots.has(`${hour}_${minute}`)) {
                await whatsappService.sendTextMessage(
                  phoneNumberId,
                  from,
                  'Sorry, this time slot was just booked by someone else. Please select a different time.',
                  message.id
                );
                return;
              }

              const { selectedService, selectedDate } = session;
              const dateStr = selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              });

              // Get customer record
              const customer = await customerCollection.findOne({ phoneNumber: from });
              
              // Create booking record
              const booking = new Booking({
                customerId: customer._id,
                serviceId: selectedService._id, // Fix: Use _id instead of id
                status: 'CONFIRMED',
                appointmentDate: selectedDate,
                appointmentTime: selectedSlot.title
              });

              await Booking.getCollection(db).insertOne(booking);

              // Send confirmation message
              const response = await whatsappService.sendTextMessage(
                phoneNumberId,
                from,
                MESSAGES.BOOKING_CONFIRMED(
                  userName,
                  selectedService.title,
                  dateStr,
                  selectedSlot.title,
                  booking.bookingReference
                ),
                message.id
              );

              // Store the confirmation message ID
              const confirmationMessageId = response.data?.messages?.[0]?.id;
              if (confirmationMessageId) {
                await Booking.getCollection(db).updateOne(
                  { _id: booking._id },
                  { 
                    $set: { 
                      confirmationMessageId,
                      updatedAt: new Date()
                    }
                  }
                );
              }

              // Clear session after successful booking
              await sessionService.clearSession(from);
            }
          }
      }
    } 
    // Handle text messages
    else if (message.type === 'text') {
      const text = message.text.body.toLowerCase().trim();
      const isGreeting = GREETING_PATTERNS.some(pattern => pattern.test(text));
      
      if (isGreeting) {
        session = await sessionService.createSession(from, userName);
        
        const buttons = [
          { type: 'reply', reply: { id: 'choose_service', title: '💇 Choose a Service' } },
          { type: 'reply', reply: { id: 'my_reservations', title: '📅 My Reservations' } },
          { type: 'reply', reply: { id: 'loyalty_points', title: '🎁 Loyalty Points' } }
        ];

        await whatsappService.sendButtonMessage(
          phoneNumberId,
          from,
          MESSAGES.WELCOME(userName),
          buttons,
          message.id
        );
      }
    }

    await whatsappService.markMessageAsRead(phoneNumberId, message.id);
    res.sendStatus(200);
  } catch (error) {
    logger.error('Error handling incoming message', error, { 
      payload: error.response?.data 
    });
    next(error);
  }
};

export const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.webhookVerifyToken) {
    logger.info("Webhook verified successfully");
    res.status(200).send(challenge);
  } else {
    logger.error("Webhook verification failed", null, { mode, token });
    res.sendStatus(403);
  }
};