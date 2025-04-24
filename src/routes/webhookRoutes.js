import express from 'express';
import { handleIncomingMessage, verifyWebhook } from '../controllers/webhookController.js';

const router = express.Router();

router.post('/', handleIncomingMessage);
router.get('/', verifyWebhook);

export default router;