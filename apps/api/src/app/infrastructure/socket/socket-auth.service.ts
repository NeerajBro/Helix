import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { JwtPayload } from '@helix/types';

@Injectable()
export class SocketAuthService {
  constructor(private readonly jwtService: JwtService) {}

  authenticate(client: Socket): JwtPayload {
    const authToken = client.handshake.auth?.['token'];
    const queryToken = client.handshake.query?.['token'];
    const token =
      (typeof authToken === 'string' ? authToken : undefined) ??
      (typeof queryToken === 'string' ? queryToken : undefined);

    if (!token) {
      throw new UnauthorizedException('Socket authentication token missing');
    }

    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid socket authentication token');
    }
  }
}
