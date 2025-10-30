import express from 'express';
import { healthHandler } from '../controllers/healthController.js';
import { metricsHandler } from '../controllers/metricsController.js';
import { postTelemetry } from '../controllers/telemetryController.js';
import { getUsers } from '../controllers/usersController.js';

const router = express.Router();

router.get('/healthz', healthHandler);
router.get('/metrics', metricsHandler);
router.post('/telemetry', postTelemetry);
router.get('/users', getUsers);

export default router;
