
 

var io = require('socket.io-client');

var socket;

export default class SocketHelper{
  constructor() {
    this.socket = null;
  }

  initSocket() {
    if (this.socket) {
      // Return the existing socket instance if it has already been created
      return this.socket;
    }

    var current_hostname = window.location.hostname;
    const socketServer = 'http://' + current_hostname + ':2063';
    const options = { transports: ['websocket'], forceNew: true };
    this.socket = io(socketServer, options);

    // Socket events
    this.socket.on('connect', () => {
      console.log('connected to socket.io server');
    });

    this.socket.on('disconnect', () => {
      console.log('disconnected from socket.io server');
    });

    return this.socket;
  }


    emitEvent(evt,args){
        console.log('emit',evt,args)
        this.socket.emit(evt,args);   
    }
 




}