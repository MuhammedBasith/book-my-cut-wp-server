export const SERVICES = {
  HAIR: [
    { id: 'haircut_men', title: 'Mens Haircut', description: 'Classic cut & style' },
    { id: 'haircut_women', title: 'Womens Haircut', description: 'Cut, wash & blow dry' },
    { id: 'color_global', title: 'Global Color', description: 'Full head coloring' },
    { id: 'highlights', title: 'Highlights', description: 'Partial or full highlights' }
  ],
  SKIN: [
    { id: 'facial_basic', title: 'Basic Facial', description: 'Deep cleansing facial' },
    { id: 'facial_premium', title: 'Premium Facial', description: 'Anti-aging treatment' },
    { id: 'cleanup', title: 'Clean Up', description: 'Quick refresh treatment' }
  ],
  NAILS: [
    { id: 'manicure', title: 'Manicure', description: 'Classic nail care' },
    { id: 'pedicure', title: 'Pedicure', description: 'Foot & nail treatment' }
  ]
};

export const GREETING_PATTERNS = [
  'hi',
  'hey',
  'hello',
  'menu',
  'start',
  'help'
];

export const MESSAGES = {
  WELCOME: (name) => `Hi ${name}, welcome to GlamStudio! What would you like to do today?`,
  CHOOSE_SERVICE: 'Please choose a service you\'d like to book.',
  CHOOSE_DATE: 'Choose a date for your appointment:',
  CHOOSE_TIME: 'Select a suitable time for your visit.',
  LOYALTY_POINTS: '🎁 Loyalty points tracking is coming soon! Stay tuned. 🚀',
  BOOKING_CONFIRMED: (name, service, date, time) => 
    `✅ Awesome ${name}! Your appointment for ${service} is booked on ${date} at ${time}.\nWe'll see you soon! 💇‍♀️`
};