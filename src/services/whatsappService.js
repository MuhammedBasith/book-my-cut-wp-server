import axios from 'axios';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

class WhatsappServiceError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

class WhatsappService {
  async sendMessage(phoneNumberId, to, data, messageId = null) {
    try {
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        ...data
      };

      if (messageId) {
        payload.context = { message_id: messageId };
      }

      logger.info('Sending WhatsApp message', { to, messageId, type: data.type || 'text' });

      const response = await axios({
        method: "POST",
        url: `https://graph.facebook.com/${config.graphApiVersion}/${phoneNumberId}/messages`,
        headers: {
          Authorization: `Bearer ${config.graphApiToken}`,
          'Content-Type': 'application/json'
        },
        data: payload
      });

      logger.info('Message sent successfully', { 
        to, 
        messageId: response.data?.messages?.[0]?.id 
      });

      return response;
    } catch (error) {
      // Handle Meta API specific errors
      if (error.response?.data) {
        const metaError = error.response.data.error;
        
        // Token expired or invalid
        if (metaError.code === 190) {
          throw new WhatsappServiceError(
            'WhatsApp API token has expired. Please refresh the token.',
            'TOKEN_EXPIRED',
            401
          );
        }
        
        // Permission error
        if (metaError.code === 200) {
          throw new WhatsappServiceError(
            'WhatsApp API access denied. Please check permissions.',
            'ACCESS_DENIED',
            403
          );
        }

        // Rate limiting
        if (metaError.code === 4) {
          throw new WhatsappServiceError(
            'Rate limit exceeded. Please try again later.',
            'RATE_LIMIT',
            429
          );
        }

        // Template error
        if (metaError.code === 131030) {
          throw new WhatsappServiceError(
            'Message template error. Please verify the template.',
            'TEMPLATE_ERROR',
            400
          );
        }
      }

      logger.error('Failed to send WhatsApp message', error, { 
        to, 
        messageId,
        response: error.response?.data,
        code: error.response?.data?.error?.code
      });

      throw new WhatsappServiceError(
        'Failed to send WhatsApp message',
        'WHATSAPP_ERROR',
        500
      );
    }
  }

  async sendTextMessage(phoneNumberId, to, text, messageId = null) {
    return this.sendMessage(phoneNumberId, to, { text: { body: text } }, messageId);
  }

  async sendButtonMessage(phoneNumberId, to, body, buttons, messageId = null) {
    return this.sendMessage(phoneNumberId, to, {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: { buttons }
      }
    }, messageId);
  }

  async sendListMessage(phoneNumberId, to, header, body, sections, messageId = null) {
    return this.sendMessage(phoneNumberId, to, {
      type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: header },
        body: { text: body },
        action: {
          button: "Select an option",
          sections: sections
        }
      }
    }, messageId);
  }

  async markMessageAsRead(phoneNumberId, messageId) {
    try {
      logger.info('Marking message as read', { messageId });

      const response = await axios({
        method: "POST",
        url: `https://graph.facebook.com/${config.graphApiVersion}/${phoneNumberId}/messages`,
        headers: {
          Authorization: `Bearer ${config.graphApiToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
        },
      });

      logger.info('Message marked as read successfully', { messageId });
      return response;
    } catch (error) {
      // Handle Meta API specific errors same as sendMessage
      if (error.response?.data) {
        const metaError = error.response.data.error;
        
        if (metaError.code === 190) {
          throw new WhatsappServiceError(
            'WhatsApp API token has expired. Please refresh the token.',
            'TOKEN_EXPIRED',
            401
          );
        }
        
        if (metaError.code === 200) {
          throw new WhatsappServiceError(
            'WhatsApp API access denied. Please check permissions.',
            'ACCESS_DENIED',
            403
          );
        }
      }

      logger.error('Failed to mark message as read', error, { 
        messageId,
        response: error.response?.data,
        code: error.response?.data?.error?.code
      });

      throw new WhatsappServiceError(
        'Failed to mark message as read',
        'WHATSAPP_ERROR',
        500
      );
    }
  }
}

export const whatsappService = new WhatsappService();