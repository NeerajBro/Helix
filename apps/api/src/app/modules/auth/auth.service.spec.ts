import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    email: 'admin@helix.com',
    passwordHash: '',
    firstName: 'Admin',
    lastName: 'User',
    avatarUrl: null,
    status: 'ACTIVE' as const,
    departmentId: null,
    deletedAt: null,
    roles: [
      {
        role: {
          slug: 'super-admin',
          permissions: [{ permission: { slug: 'users:read' } }],
        },
      },
    ],
    department: null,
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('Admin123!', 12);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            refreshToken: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('access-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                'jwt.refreshExpiresIn': '7d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
  });

  describe('login', () => {
    it('should return user and tokens on valid credentials', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await service.login({
        email: 'admin@helix.com',
        password: 'Admin123!',
      });

      expect(result.user.email).toBe('admin@helix.com');
      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw on invalid credentials', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@helix.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
