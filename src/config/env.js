import dotenv from 'dotenv';

dotenv.config();

export const config = {
  webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN,
  graphApiToken: process.env.GRAPH_API_TOKEN,
  port: process.env.PORT || 3000,
  graphApiVersion: 'v18.0',
  mongodb: {
    uri: process.env.MONGODB_URI,
    dbName: 'bookmycut',
    options: {
      retryWrites: true,
      w: 'majority'
    }
  }
};