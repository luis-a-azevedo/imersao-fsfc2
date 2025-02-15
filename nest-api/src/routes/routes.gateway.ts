import { Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Producer } from '@nestjs/microservices/external/kafka.interface';
import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { RoutesService } from './routes.service';

@WebSocketGateway()
export class RoutesGateway implements OnModuleInit{
  private kafakaProducer: Producer;

  @WebSocketServer()
  server: Server;

  constructor(
    @Inject('KAFKA_SERVICE')
    private kafkaClient: ClientKafka,
  ) {}  

  async onModuleInit() {
    this.kafakaProducer = await this.kafkaClient.connect();
  }

  @SubscribeMessage('new-direction')
  handleMessage(client: Socket, payload: {routeId: string}){
    this.kafakaProducer.send({
      topic: 'route.new-direction',
      messages: [
        {
          key: 'route.new-direction',
          value: JSON.stringify({ routeId: payload.routeId, clientId: client.id }),
        },
      ],
    });    
    console.log(payload)
  }

  sendPosition(data:{
    clientId: string;
    routeId: string;
    position: [number, number];
    finished: boolean;
  }){
    const {clientId, ...rest} = data;
    const clients = this.server.sockets.connected;
    if(!(clientId in clients)){
      console.error('Cllient not exists, refresh React Application and resend new directions again.');
      return;
    }
    clients[clientId].emit('new-position', rest);
  }
}
