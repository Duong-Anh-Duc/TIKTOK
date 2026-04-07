import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { schedulerService } from './modules/scheduler/scheduler.service';

const start = async () => {
  try {
    app.listen(config.port, async () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      await schedulerService.initAll();
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
