import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getData(): { message: string; version: string } {
    return {
      message: 'Welcome to HELIX API',
      version: '1.0.0',
    };
  }
}
