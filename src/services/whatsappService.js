import axios from 'axios';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

class WhatsappService {
  async sendMessage(phoneNumberId, to, data, messageId = null) {
    try {
      const payload = {
        messaging_product: "whatsapp",
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
        },
        data: payload
      });

      logger.info('Message sent successfully', { 
        to, 
        messageId: response.data?.messages?.[0]?.id 
      });

      return response;
    } catch (error) {
      logger.error('Failed to send WhatsApp message', error, { to, messageId });
      throw error;
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
        action: { sections }
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
      logger.error('Failed to mark message as read', error, { messageId });
      throw error;
    }
  }
}

export const whatsappService = new WhatsappService();