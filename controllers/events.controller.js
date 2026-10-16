import { EventService } from '../services/events.service.js';

const eventService = new EventService();

const handleError = (res, error) => {
  res.status(error.status || 500).json({
    status: 'error',
    message: error.status ? error.message : 'Error interno del servidor',
  });
};

// GET /api/events?page=&limit=&status=&category=&location=&from=&to=&sortBy=&order=
export const listEvents = async (req, res) => {
  try {
    const result = await eventService.list(req.query, req.user);
    res.status(200).json({ status: 'success', ...result });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/events/:eid
export const getEvent = async (req, res) => {
  try {
    const event = await eventService.getById(req.params.eid, req.user);
    res.status(200).json({ status: 'success', payload: event });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/events
export const createEvent = async (req, res) => {
  try {
    const event = await eventService.create(req.body, req.user);
    res.status(201).json({ status: 'success', payload: event });
  } catch (error) {
    handleError(res, error);
  }
};

// PUT /api/events/:eid
export const updateEvent = async (req, res) => {
  try {
    const event = await eventService.update(req.params.eid, req.body, req.user);
    res.status(200).json({ status: 'success', payload: event });
  } catch (error) {
    handleError(res, error);
  }
};

// PATCH /api/events/:eid/status
export const updateEventStatus = async (req, res) => {
  try {
    const event = await eventService.updateStatus(req.params.eid, req.body.status, req.user);
    res.status(200).json({ status: 'success', payload: event });
  } catch (error) {
    handleError(res, error);
  }
};