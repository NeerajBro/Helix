import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthTokens, AuthUser, JwtPayload } from '@helix/types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
        department: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = user.roles.map((ur) => ur.role.slug);
    const permissions = [
      ...new Set(
        user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.slug),
        ),
      ),
    ];

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles,
      permissions,
    };

    const tokens = await this.generateTokens(payload);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl ?? undefined,
        roles,
        permissions,
        departmentId: user.departmentId ?? undefined,
      },
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: { include: { permission: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!stored || stored.user.deletedAt || stored.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const roles = stored.user.roles.map((ur) => ur.role.slug);
    const permissions = [
      ...new Set(
        stored.user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.slug),
        ),
      ),
    ];

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens({
      sub: stored.user.id,
      email: stored.user.email,
      roles,
      permissions,
    });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const roles = user.roles.map((ur) => ur.role.slug);
    const permissions = [
      ...new Set(
        user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.slug),
        ),
      ),
    ];

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl ?? undefined,
      roles,
      permissions,
      departmentId: user.departmentId ?? undefined,
    };
  }

  private async generateTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = randomBytes(64).toString('hex');
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn', '7d');
    const expiresAt = this.parseExpiry(refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: payload.sub,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  private parseExpiry(expiry: string): Date {
    const match = expiry.match(/^(\d+)([dhms])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * (multipliers[unit] ?? multipliers['d']));
  }
}
