export class EventDTO {
  constructor(event) {
    this.id = event._id;
    this.title = event.title;
    this.description = event.description;
    this.category = event.category;
    this.date = event.date;
    this.location = event.location;
    this.capacity = event.capacity;
    this.price = event.price;
    this.status = event.status;
    // organizer puede venir populado (objeto) o como id
    this.organizer =
      event.organizer && event.organizer.email
        ? {
            id: event.organizer._id,
            first_name: event.organizer.first_name,
            last_name: event.organizer.last_name,
            email: event.organizer.email,
          }
        : event.organizer;
  }

  static from(event) {
    return event ? new EventDTO(event) : null;
  }

  static many(events) {
    return events.map((event) => EventDTO.from(event));
  }
}