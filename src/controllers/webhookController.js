import { whatsappService } from '../services/whatsappService.js';
import { sessionService } from '../services/sessionService.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { GREETING_PATTERNS, MESSAGES, SERVICES } from '../constants/salon.js';

const generateTimeSlots = () => {
  const slots = [];
  for (let h = 9; h < 21; h++) {
    const hour = h < 12 ? `${h}` : `${h-12}`;
    const ampm = h < 12 ? 'AM' : 'PM';
    slots.push(
      { id: `slot_${h}_00`, title: `${hour}:00 ${ampm} - ${hour}:30 ${ampm}` },
      { id: `slot_${h}_30`, title: `${hour}:30 ${ampm} - ${h === 20 ? '9' : `${hour+1}`}:00 ${ampm}` }
    );
  }
  return slots;
};

const generateDateOptions = () => {
  const dates = [];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayName = days[date.getDay()];
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (i === 0) {
      dates.push({ id: `date_today`, title: `Today (${dateStr})` });
    } else if (i === 1) {
      dates.push({ id: `date_tomorrow`, title: `Tomorrow (${dateStr})` });
    } else {
      dates.push({ id: `date_${date.toISOString().split('T')[0]}`, title: `${dayName} (${dateStr})` });
    }
  }
  return dates;
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
    let session = sessionService.getSession(from);

    // Handle interactive messages (button/list responses)
    if (message.type === 'interactive') {
      const response = message.interactive;
      const responseId = response.button_reply?.id || response.list_reply?.id;

      if (!session) {
        session = sessionService.createSession(from, userName);
      }

      switch (responseId) {
        case 'choose_service':
          // Format sections according to WhatsApp API requirements
          const serviceSections = Object.entries(SERVICES).map(([category, services]) => ({
            title: category,
            rows: services.map(service => ({
              id: service.id,
              title: service.title.substring(0, 24), // Max 24 chars
              description: service.description.substring(0, 72) // Max 72 chars
            }))
          })).slice(0, 10); // Max 10 sections

          await whatsappService.sendListMessage(
            phoneNumberId,
            from,
            'Our Services',
            MESSAGES.CHOOSE_SERVICE,
            serviceSections,
            message.id
          );
          sessionService.updateSession(from, { step: 'selecting_service' });
          break;

        case 'my_reservations':
          // Placeholder for future implementation
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
              sessionService.updateSession(from, { 
                step: 'selecting_date',
                selectedService: selectedService
              });

              const dateButtons = [
                { type: 'reply', reply: { id: 'date_today', title: 'Today' } },
                { type: 'reply', reply: { id: 'date_tomorrow', title: 'Tomorrow' } },
                { type: 'reply', reply: { id: 'date_other', title: 'Pick Another Day' } }
              ];

              await whatsappService.sendButtonMessage(
                phoneNumberId,
                from,
                MESSAGES.CHOOSE_DATE,
                dateButtons,
                message.id
              );
            }
          } else if (session.step === 'selecting_date') {
            if (responseId === 'date_other') {
              const dates = generateDateOptions().slice(2); // Exclude today and tomorrow
              await whatsappService.sendListMessage(
                phoneNumberId,
                from,
                'Available Dates',
                'Choose your preferred date:',
                [{ title: 'Next 5 Days', rows: dates }],
                message.id
              );
            } else {
              const selectedDate = responseId === 'date_today' 
                ? new Date() 
                : responseId === 'date_tomorrow'
                  ? new Date(Date.now() + 86400000)
                  : new Date(responseId.replace('date_', ''));

              sessionService.updateSession(from, {
                step: 'selecting_time',
                selectedDate: selectedDate
              });

              const timeSlots = generateTimeSlots();
              await whatsappService.sendListMessage(
                phoneNumberId,
                from,
                'Available Time Slots',
                MESSAGES.CHOOSE_TIME,
                [{ title: 'Available Slots', rows: timeSlots }],
                message.id
              );
            }
          } else if (session.step === 'selecting_time' && responseId.startsWith('slot_')) {
            const timeSlots = generateTimeSlots();
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
              sessionService.clearSession(from);
            }
          }
      }
    } 
    // Handle text messages
    else if (message.type === 'text') {
      const text = message.text.body.toLowerCase().trim();
      
      if (GREETING_PATTERNS.includes(text)) {
        session = sessionService.createSession(from, userName);
        
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