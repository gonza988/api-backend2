import { EventDao } from '../dao/event.dao.js';

export class EventRepository {
  constructor(eventDao = new EventDao()) {
    this.dao = eventDao;
  }

  create(data) {
    return this.dao.create(data);
  }

  listPaginated(filter, options) {
    return this.dao.findPaginated(filter, options);
  }

  count(filter) {
    return this.dao.count(filter);
  }

  getById(id) {
    return this.dao.findById(id);
  }

  updateById(id, data) {
    return this.dao.updateById(id, data);
  }
}