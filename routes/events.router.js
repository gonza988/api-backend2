

import { Router } from 'express';
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  updateEventStatus,
} from '../controllers/events.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.middleware.js';
import eventTicketsRouter from './event-tickets.router.js';

const router = Router();

// Públicas (auth: organizer/admin ven además sus eventos no publicados)
router.get('/', auth, listEvents); // ?page=&limit=&status=&category=&location=&from=&to=&sortBy=&order=
router.get('/:eid', auth, getEvent);

// Protegidas por rol
router.post('/', auth, authorizeRoles('organizer', 'admin'), createEvent);
router.put('/:eid', auth, authorizeRoles('organizer', 'admin'), updateEvent);
router.patch('/:eid/status', auth, authorizeRoles('organizer', 'admin'), updateEventStatus);

// Sub-recurso: /api/events/:eid/tickets
router.use('/:eid/tickets', eventTicketsRouter);

export default router;