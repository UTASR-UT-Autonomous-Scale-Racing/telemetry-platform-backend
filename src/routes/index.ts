import express from 'express';
import { healthHandler } from '../controllers/healthController.js';
import { metricsHandler } from '../controllers/metricsController.js';
import { postTelemetry } from '../controllers/telemetryController.js';
import { getUsers, createUser } from '../controllers/usersController.js';
import { register, login, refresh, logout, revokeAll } from '../controllers/authController.js';
import { validateBody } from "../middlewares/validate.js";
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from '../schemas/authSchemas.js';
import { createUserSchema } from "../schemas/userSchema.js";
import { auth } from "../middlewares/auth.js"
const router = express.Router();

router.get('/healthz', healthHandler);
router.get('/metrics', auth, metricsHandler);
router.post('/telemetry', auth, postTelemetry);
router.get('/users', auth, getUsers);
router.post('/users', auth, validateBody(createUserSchema), createUser);

// auth
router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/auth/refresh', validateBody(refreshSchema), refresh);
router.post('/auth/logout', validateBody(logoutSchema), logout);
router.post('/auth/revoke-all', auth, revokeAll);

export default router;
