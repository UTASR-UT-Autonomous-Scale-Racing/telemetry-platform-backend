import express from 'express';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { initPostgres } from './config/postgres.js';
import { initInflux } from './config/influx.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/logger.js';

import jetsonClient from './services/jetsonTcpClient.js';

dotenv.config();

const PORT = Number(process.env.PORT || 8080);

async function start() {
  await initPostgres();
  await initInflux();

  const app = express();
  app.use(express.json());
  app.use(requestLogger);

  app.use('/', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });

  jetsonClient.connect();
}

start().catch((err) => {
  console.error('Failed to start', err);
  process.exit(1);
});
