import { whatsappService } from '../services/whatsappService.js';
import { sessionService } from '../services/sessionService.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { GREETING_PATTERNS, MESSAGES, SERVICES } from '../constants/salon.js';

const TIME_RANGES = {
  morning: { start: 9, end: 12, label: 'Morning (9 AM - 12 PM)' },
  afternoon: { start: 12, end: 16, label: 'Afternoon (12 PM - 4 PM)' },
  evening: { start: 16, end: 21, label: 'Evening (4 PM - 9 PM)' }
};

const generateTimeRangeOptions = () => {
  return [{
    title: "Available Time Slots",
    rows: Object.entries(TIME_RANGES).map(([id, range]) => ({
      id: `range_${id}`,
      title: range.label,
      description: 'Select to see available slots'
    }))
  }];
};

const generateTimeSlotsForRange = (rangeId) => {
  const range = TIME_RANGES[rangeId.replace('range_', '')];
  if (!range) return [];

  const slots = [];
  for (let h = range.start; h < range.end; h++) {
    const hour = h < 12 ? `${h}` : `${h-12}`;
    const ampm = h < 12 ? 'AM' : 'PM';
    
    slots.push(
      { id: `slot_${h}_00`, title: `${hour}:00 ${ampm}`, description: '30 minute slot' },
      { id: `slot_${h}_30`, title: `${hour}:30 ${ampm}`, description: '30 minute slot' }
    );
  }

  return [{
    title: range.label,
    rows: slots
  }];
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
          // Format sections according to WhatsApp API requirements
          const serviceSections = Object.entries(SERVICES).map(([category, services]) => ({
            title: category,
            rows: services.map(service => ({
              id: service.id,
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
          await whatsappService.sendTextMessage(
            phoneNumberId,
            from,
            MESSAGES.LOYALTY_POINTS,
            message.id
          );
          break;

        default:
          if (session.step === 'selecting_service' && responseId.includes('_')) {
            const selectedService = Object.values(SERVICES)
              .flat()
              .find(service => service.id === responseId);

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
              generateTimeRangeOptions(),
              message.id
            );
          } else if (session.step === 'selecting_time_range' && responseId.startsWith('range_')) {
            await sessionService.updateSession(from, {
              step: 'selecting_time',
              selectedTimeRange: responseId
            });

            await whatsappService.sendListMessage(
              phoneNumberId,
              from,
              'Select Time',
              'Choose your preferred appointment time:',
              generateTimeSlotsForRange(responseId),
              message.id
            );
          } else if (session.step === 'selecting_time' && responseId.startsWith('slot_')) {
            const timeSlots = generateTimeSlotsForRange(session.selectedTimeRange)
              .flatMap(section => section.rows);
            const selectedSlot = timeSlots.find(slot => slot.id === responseId);
            
            if (selectedSlot) {
              const { selectedService, selectedDate } = session;
              const dateStr = selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              });

              await whatsappService.sendTextMessage(
                phoneNumberId,
                from,
                MESSAGES.BOOKING_CONFIRMED(
                  userName,
                  selectedService.title,
                  dateStr,
                  selectedSlot.title
                ),
                message.id
              );

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