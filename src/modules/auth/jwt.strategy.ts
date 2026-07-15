import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (() => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is required');
        }
        return secret;
      })(),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, isActive: true },
      relations: { roles: { permissions: true } },
    });

    if (!user) return null;

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
      provinceId: user.provinceId,
      districtId: user.districtId,
      isMobileUser: user.isMobileUser,
      roles: user.roles.map((r) => ({ id: r.id, code: r.code, name: r.name })),
      permissions: Array.from(permissions),
    };
  }
}
