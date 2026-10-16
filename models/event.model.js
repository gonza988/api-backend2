import mongoose from 'mongoose';

export const EVENT_STATUSES = ['draft', 'published', 'cancelled', 'finished'];

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, lowercase: true },
    date: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: EVENT_STATUSES, default: 'draft' },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, versionKey: false }
);

export const EventModel = mongoose.model('Event', eventSchema);