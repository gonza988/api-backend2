import { EventRepository } from '../repositories/event.repository.js';
import { EventDTO } from '../dto/event.dto.js';
import { HttpError } from '../utils/errors.js';
import { isValidObjectId } from '../utils/objectId.js';

const STATUSES = ['draft', 'published', 'cancelled', 'finished'];

// Transiciones permitidas de estado
const TRANSITIONS = {
  draft: ['published', 'cancelled'],
  published: ['cancelled', 'finished'],
  cancelled: [],
  finished: [],
};

const SORTABLE = ['date', 'price', 'createdAt', 'title'];
const EDITABLE_FIELDS = ['title', 'description', 'category', 'date', 'location', 'capacity', 'price'];

const organizerIdOf = (event) =>
  event.organizer?._id ? event.organizer._id.toString() : event.organizer?.toString();

const parseDate = (value, label = 'date') => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, `${label} no es una fecha válida`);
  return d;
};

const assertFutureDate = (d) => {
  if (d <= new Date()) throw new HttpError(400, 'La fecha del evento no puede estar en el pasado');
};

const assertCapacity = (value) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, 'capacity debe ser un entero mayor a 0');
  return n;
};

const assertPrice = (value) => {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) throw new HttpError(400, 'price debe ser un número mayor o igual a 0');
  return n;
};

const assertId = (id) => {
  if (!isValidObjectId(id)) throw new HttpError(400, 'El id del evento no es válido');
};

export class EventService {
  constructor(eventRepo = new EventRepository()) {
    this.eventRepository = eventRepo;
  }

  // user puede ser undefined (request público)
  async list(query = {}, user) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);

    const filter = {};

    // Visibilidad: público/user solo ve publicados; organizer ve publicados + los suyos; admin ve todo
    const requested = query.status;
    if (requested && !STATUSES.includes(requested)) {
      throw new HttpError(400, `status inválido. Valores: ${STATUSES.join(', ')}`);
    }
    if (user?.role === 'admin') {
      if (requested) filter.status = requested;
    } else if (user?.role === 'organizer' && requested && requested !== 'published') {
      filter.status = requested;
      filter.organizer = user.id; // solo sus propios eventos no publicados
    } else {
      filter.status = 'published';
      if (requested && requested !== 'published') {
        throw new HttpError(403, 'No autorizado para listar eventos con ese estado');
      }
    }

    if (query.category) filter.category = String(query.category).trim().toLowerCase();
    if (query.location) {
      const escaped = String(query.location).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.location = new RegExp(escaped, 'i');
    }
    if (query.from || query.to) {
      filter.date = {};
      if (query.from) filter.date.$gte = parseDate(query.from, 'from');
      if (query.to) filter.date.$lte = parseDate(query.to, 'to');
    }

    const sortBy = SORTABLE.includes(query.sortBy) ? query.sortBy : 'date';
    const order = query.order === 'desc' ? -1 : 1;

    const [events, total] = await Promise.all([
      this.eventRepository.listPaginated(filter, {
        sort: { [sortBy]: order },
        skip: (page - 1) * limit,
        limit,
      }),
      this.eventRepository.count(filter),
    ]);

    return {
      data: EventDTO.many(events),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(id, user) {
    assertId(id);
    const event = await this.eventRepository.getById(id);
    if (!event) throw new HttpError(404, 'Evento no encontrado');

    // Eventos no publicados: solo dueño o admin (para el resto "no existe")
    if (event.status !== 'published') {
      const canSee = user && (user.role === 'admin' || organizerIdOf(event) === user.id);
      if (!canSee) throw new HttpError(404, 'Evento no encontrado');
    }
    return EventDTO.from(event);
  }

  async create(payload, user) {
    const { title, description, category, date, location } = payload;
    const missing = ['title', 'description', 'category', 'date', 'location', 'capacity'].filter(
      (f) => payload[f] === undefined || payload[f] === null || payload[f] === ''
    );
    if (missing.length) throw new HttpError(400, `Campos obligatorios: ${missing.join(', ')}`);

    const eventDate = parseDate(date);
    assertFutureDate(eventDate);

    // status inicial: draft por defecto; solo se permite draft o published al crear
    const status = payload.status ?? 'draft';
    if (!['draft', 'published'].includes(status)) {
      throw new HttpError(400, 'Al crear, status solo puede ser draft o published');
    }

    const event = await this.eventRepository.create({
      title,
      description,
      category,
      date: eventDate,
      location,
      capacity: assertCapacity(payload.capacity),
      price: payload.price === undefined ? 0 : assertPrice(payload.price),
      status,
      organizer: user.id, // nunca se toma del body
    });

    const populated = await this.eventRepository.getById(event._id);
    return EventDTO.from(populated);
  }

  async update(id, payload, user) {
    assertId(id);
    const event = await this.eventRepository.getById(id);
    if (!event) throw new HttpError(404, 'Evento no encontrado');

    if (user.role !== 'admin' && organizerIdOf(event) !== user.id) {
      throw new HttpError(403, 'Solo el organizador dueño o un admin pueden modificar este evento');
    }
    if (['cancelled', 'finished'].includes(event.status)) {
      throw new HttpError(409, `No se puede modificar un evento ${event.status}`);
    }

    const changes = {};
    for (const field of EDITABLE_FIELDS) {
      if (payload[field] !== undefined) changes[field] = payload[field];
    }
    if (!Object.keys(changes).length) throw new HttpError(400, 'No hay campos para actualizar');

    if (changes.date !== undefined) {
      changes.date = parseDate(changes.date);
      assertFutureDate(changes.date);
    }
    if (changes.capacity !== undefined) changes.capacity = assertCapacity(changes.capacity);
    if (changes.price !== undefined) changes.price = assertPrice(changes.price);

    const updated = await this.eventRepository.updateById(id, changes);
    return EventDTO.from(updated);
  }

  async updateStatus(id, status, user) {
    assertId(id);
    if (!STATUSES.includes(status)) {
      throw new HttpError(400, `status inválido. Valores: ${STATUSES.join(', ')}`);
    }

    const event = await this.eventRepository.getById(id);
    if (!event) throw new HttpError(404, 'Evento no encontrado');

    if (user.role !== 'admin' && organizerIdOf(event) !== user.id) {
      throw new HttpError(403, 'Solo el organizador dueño o un admin pueden cambiar el estado');
    }
    if (event.status === 'cancelled') {
      throw new HttpError(409, 'No se puede modificar un evento cancelado');
    }
    if (!TRANSITIONS[event.status].includes(status)) {
      throw new HttpError(409, `No se puede pasar de ${event.status} a ${status}`);
    }

    const updated = await this.eventRepository.updateById(id, { status });
    return EventDTO.from(updated);
  }
}