import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { LoginClient, LoginDto } from './dto/login.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    // Ensure default admin exists after migrations/seed
  }

  async login(dto: LoginDto) {
    const client = dto.client ?? LoginClient.PORTAL;
    const source = client === LoginClient.MOBILE ? 'mobile' : 'portal';

    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase(), isActive: true },
      relations: { roles: { permissions: true } },
    });

    if (!user) {
      await this.auditService.log({
        entityType: 'auth',
        action: 'login_failed',
        source,
        description: `Failed login attempt for ${dto.email}`,
        newValue: { email: dto.email, reason: 'user_not_found' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.auditService.log({
        entityType: 'auth',
        entityId: user.id,
        action: 'login_failed',
        actorId: user.id,
        actorName: user.fullName,
        actorEmail: user.email,
        source,
        description: `Failed login (bad password) for ${user.email}`,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (client === LoginClient.PORTAL && user.isMobileUser) {
      await this.auditService.log({
        entityType: 'auth',
        entityId: user.id,
        action: 'login_blocked',
        actorId: user.id,
        actorName: user.fullName,
        actorEmail: user.email,
        source: 'portal',
        description: `Mobile user blocked from portal login: ${user.email}`,
      });
      throw new ForbiddenException(
        'Mobile field users cannot sign in to the supervisor portal. Please use the PNMC Field Inspector mobile app.',
      );
    }

    if (client === LoginClient.MOBILE && !user.isMobileUser) {
      await this.auditService.log({
        entityType: 'auth',
        entityId: user.id,
        action: 'login_blocked',
        actorId: user.id,
        actorName: user.fullName,
        actorEmail: user.email,
        source: 'mobile',
        description: `Portal user blocked from mobile login: ${user.email}`,
      });
      throw new ForbiddenException(
        'This account is for the supervisor portal only. Mobile app access is limited to field inspector accounts.',
      );
    }

    const permissions = new Set<string>();
    for (const role of user.roles ?? []) {
      for (const perm of role.permissions ?? []) {
        permissions.add(perm.code);
      }
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') ?? '7d',
    });

    await this.auditService.log({
      entityType: 'auth',
      entityId: user.id,
      action: 'login_success',
      actorId: user.id,
      actorName: user.fullName,
      actorEmail: user.email,
      source,
      description: `${user.fullName} signed in via ${source}`,
      newValue: {
        client,
        roles: user.roles.map((r) => r.code),
        isMobileUser: user.isMobileUser,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        employeeId: user.employeeId,
        province: user.province,
        district: user.district,
        isMobileUser: user.isMobileUser,
        roles: user.roles.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
        })),
        permissions: Array.from(permissions),
      },
    };
  }

  async logout(userId: string, source: 'portal' | 'mobile' = 'portal') {
    await this.auditService.log({
      entityType: 'auth',
      entityId: userId,
      action: 'logout',
      actorId: userId,
      source,
      description: `User signed out via ${source}`,
    });
    return { message: 'Logged out successfully' };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
      const accessToken = this.jwtService.sign({
        sub: payload.sub,
        email: payload.email,
      });
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
      relations: { roles: { permissions: true } },
    });
    if (!user) throw new UnauthorizedException();

    const permissions = new Set<string>();
    for (const role of user.roles ?? []) {
      for (const perm of role.permissions ?? []) {
        permissions.add(perm.code);
      }
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      employeeId: user.employeeId,
      province: user.province,
      district: user.district,
      isMobileUser: user.isMobileUser,
      roles: user.roles.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
      })),
      permissions: Array.from(permissions),
    };
  }
}
