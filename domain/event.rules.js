mport mongoose from "mongoose";
import {
    DOMAIN_EVENT_TYPES,
    EVENT_STATUSES,
    REQUIRED_EVENT_FIELDS,
    STATUS_TRANSITIONS
} from "./event.constants.js";

export class BusinessError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = "BusinessError";
        this.statusCode = statusCode;
    }
}

const hasValue = (value) => value !== undefined && value !== null && value !== "";

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const assertRequiredFields = (payload, fields = REQUIRED_EVENT_FIELDS) => {
    const missing = fields.filter((field) => !hasValue(payload[field]));
    if (missing.length) {
        throw new BusinessError(`Campos obligatorios: ${missing.join(", ")}`);
    }
};

export const assertValidDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new BusinessError("Las fechas no son válidas");
    }

    if (start >= end) {
        throw new BusinessError("start_date debe ser menor a end_date");
    }

    return { start, end };
};

export const assertFutureStartDate = (startDate) => {
    const start = new Date(startDate);
    const now = new Date();

    if (start <= now) {
        throw new BusinessError("start_date debe ser una fecha futura");
    }
};

export const assertValidCapacity = (capacity) => {
    const value = Number(capacity);

    if (!Number.isInteger(value) || value < 1) {
        throw new BusinessError("capacity debe ser un entero mayor o igual a 1");
    }

    return value;
};

export const assertValidPrice = (price) => {
    const value = Number(price);

    if (Number.isNaN(value) || value < 0) {
        throw new BusinessError("price debe ser un número mayor o igual a 0");
    }

    return value;
};

export const assertValidStatus = (status) => {
    if (!EVENT_STATUSES.includes(status)) {
        throw new BusinessError(`Estado inválido. Valores permitidos: ${EVENT_STATUSES.join(", ")}`);
    }
};

export const assertStatusTransition = (currentStatus, nextStatus) => {
    assertValidStatus(nextStatus);
    const allowed = STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(nextStatus)) {
        throw new BusinessError(`No se puede pasar de ${currentStatus} a ${nextStatus}`);
    }
};

export const assertEventIsEditable = (event) => {
    if (event.status === "cancelled") {
        throw new BusinessError("No se puede modificar un evento cancelado", 409);
    }

    if (event.status === "completed") {
        throw new BusinessError("No se puede modificar un evento completado", 409);
    }
};

export const assertValidObjectId = (id, label = "id") => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BusinessError(`El ${label} no es válido`);
    }
};

export const assertEventPayload = (payload, { requireStatus = false, requireFutureStart = true } = {}) => {
    const fields = requireStatus
        ? [...REQUIRED_EVENT_FIELDS, "status"]
        : REQUIRED_EVENT_FIELDS;

    assertRequiredFields(payload, fields);
    assertValidDateRange(payload.start_date, payload.end_date);

    if (requireFutureStart) {
        assertFutureStartDate(payload.start_date);
    }

    if (requireStatus) {
        assertValidStatus(payload.status);
    }

    return {
        title: payload.title,
        description: payload.description,
        location: payload.location,
        start_date: payload.start_date,
        end_date: payload.end_date,
        capacity: assertValidCapacity(payload.capacity),
        price: assertValidPrice(payload.price),
        ...(requireStatus ? { status: payload.status } : {})
    };
};

export const buildEventFilter = (query, definitions) => {
    const filter = {};

    Object.entries(definitions).forEach(([param, rule]) => {
        const rawValue = query[param];
        if (!hasValue(rawValue)) return;

        const field = rule.field || param;

        switch (rule.type) {
            case "enum":
                if (rule.values.includes(rawValue)) {
                    filter[field] = rawValue;
                }
                break;
            case "string":
            case "regex":
                filter[field] = new RegExp(escapeRegex(rawValue), "i");
                break;
            case "objectId":
                if (mongoose.Types.ObjectId.isValid(rawValue)) {
                    filter[field] = rawValue;
                }
                break;
            case "dateGte": {
                const date = new Date(rawValue);
                if (!Number.isNaN(date.getTime())) {
                    filter[field] = { ...(filter[field] || {}), $gte: date };
                }
                break;
            }
            case "dateLte": {
                const date = new Date(rawValue);
                if (!Number.isNaN(date.getTime())) {
                    filter[field] = { ...(filter[field] || {}), $lte: date };
                }
                break;
            }
            case "numberGte": {
                const number = Number(rawValue);
                if (!Number.isNaN(number)) {
                    filter[field] = { ...(filter[field] || {}), $gte: number };
                }
                break;
            }
            case "numberLte": {
                const number = Number(rawValue);
                if (!Number.isNaN(number)) {
                    filter[field] = { ...(filter[field] || {}), $lte: number };
                }
                break;
            }
            default:
                break;
        }
    });

    return filter;
};

export const createDomainEvent = (type, payload) => ({
    type,
    payload,
    occurredAt: new Date().toISOString()
});

export const domainEventFactories = {
    created: (event) => createDomainEvent(DOMAIN_EVENT_TYPES.CREATED, {
        eventId: event._id,
        title: event.title,
        organizerId: event.organizer,
        status: event.status
    }),
    updated: (event, changes) => createDomainEvent(DOMAIN_EVENT_TYPES.UPDATED, {
        eventId: event._id,
        changes
    }),
    cancelled: (event) => createDomainEvent(DOMAIN_EVENT_TYPES.CANCELLED, {
        eventId: event._id,
        title: event.title
    })
};