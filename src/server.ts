import express from 'express';
import cors from "cors";
import routes from './routes/index.js';
import { initPostgres } from './config/postgres.js';
import { initInflux } from './config/influx.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/logger.js';
import './config/env.js';

const PORT = Number(process.env.PORT || 8080);

const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:8081",
};

async function start() {
  await initPostgres();
  await initInflux();

  const app = express();
  app.use(cors(corsOptions));
  app.use(express.json());

  app.use(express.urlencoded({ extended: true }));

  app.use(requestLogger);

  app.use('/api/v1/', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start', err);
  process.exit(1);
});
