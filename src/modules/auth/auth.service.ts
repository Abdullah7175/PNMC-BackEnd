import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { User } from '../../entities/user.entity';
import { LoginClient, LoginDto } from './dto/login.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueTokens(user: User) {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!jwtSecret || !refreshSecret) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be configured');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: this.configService.get('JWT_EXPIRES_IN') ?? '15m',
    });

    // Opaque refresh token (not a JWT) — stored hashed for revocation
    const refreshToken = randomBytes(48).toString('base64url');
    user.refreshTokenHash = this.hashToken(refreshToken);
    await this.userRepository.save(user);

    return { accessToken, refreshToken };
  }

  private buildUserResponse(user: User) {
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
      phone: user.phone,
      nic: user.nic,
      designation: user.designation,
      address: user.address,
      officeDetails: user.officeDetails,
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

  async login(dto: LoginDto) {
    const client = dto.client ?? LoginClient.PORTAL;
    const source = client === LoginClient.MOBILE ? 'mobile' : 'portal';

    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase(), isActive: true },
      relations: { roles: { permissions: true } },
    });

    if (!user) {
      try {
        await bcrypt.compare(
          dto.password,
          '$2b$10$abcdefghijklmnopqrstuuV6Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Yu',
        );
      } catch {
        /* ignore — timing pad only */
      }
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

    const tokens = await this.issueTokens(user);

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
      ...tokens,
      user: this.buildUserResponse(user),
    };
  }

  async logout(userId: string, source: 'portal' | 'mobile' = 'portal') {
    await this.userRepository.update(userId, { refreshTokenHash: null });
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
    if (!refreshToken || refreshToken.length > 2000) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const hash = this.hashToken(refreshToken);
    const user = await this.userRepository.findOne({
      where: { refreshTokenHash: hash, isActive: true },
      relations: { roles: { permissions: true } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate refresh token (OWASP — prevent reuse)
    const tokens = await this.issueTokens(user);
    return {
      ...tokens,
      user: this.buildUserResponse(user),
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
      relations: { roles: { permissions: true } },
    });
    if (!user) throw new UnauthorizedException();
    return this.buildUserResponse(user);
  }
}
