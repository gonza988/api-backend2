import { EventModel } from '../models/event.model.js';

const ORGANIZER_FIELDS = 'first_name last_name email';

export class EventDao {
  create(data) {
    return EventModel.create(data);
  }

  findPaginated(filter, { sort, skip, limit }) {
    return EventModel.find(filter)
      .populate('organizer', ORGANIZER_FIELDS)
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  count(filter) {
    return EventModel.countDocuments(filter);
  }

  findById(id) {
    return EventModel.findById(id).populate('organizer', ORGANIZER_FIELDS);
  }

  updateById(id, data) {
    return EventModel.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
      'organizer',
      ORGANIZER_FIELDS
    );
  }
}