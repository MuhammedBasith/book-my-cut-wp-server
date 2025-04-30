import express from "express";
import webhookRoutes from "./src/routes/webhookRoutes.js";
import apiRoutes from "./src/routes/apiRoutes.js";
import { config } from "./src/config/env.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { requestLogger } from "./src/middleware/requestLogger.js";
import { logger } from "./src/utils/logger.js";
import { databaseService } from "./src/services/databaseService.js";

const app = express();

// Middleware
app.use(express.json());
app.use(requestLogger);

// Routes
app.use("/webhook", webhookRoutes);
app.use("/api/v1", apiRoutes);

app.get("/", (req, res) => {
  res.send(`<pre>WhatsApp Booking Server
Status: Running
API: v1</pre>`);
});

// Error handling
app.use(errorHandler);

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection', err);
  process.exit(1);
});

// Initialize MongoDB connection and start server
const startServer = async () => {
  try {
    await databaseService.connect();
    app.listen(config.port, () => {
      logger.info(`Server is listening on port: ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();
