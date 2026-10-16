import {TicketDAO} from '../dao/ticket.dao.js';

//todo: create, createByEvent, getById, delete, findByUser, listAll

export class TicketRepository {
    constructor(dao=new TicketDAO()){
        this.dao= dao;
    }
    create(_data){
      return   this.dao.create(_data);
    }
    countConfirmed(_eventId){
throw new Error('TODO ticketRepository.countConfirmed');
}
getByEventAndUser(_eventId, _userId){
    throw new Error('TODO ticketRepository.getByEventAndUser');
}
listByUser(_userId){
    throw new Error('TODO ticketRepository.listByUser');
}
listAll(){
    throw new Error('TODO ticketRepository.listAll');
}
}