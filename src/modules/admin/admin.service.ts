import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../../entities/role.entity';
import { Permission } from '../../entities/permission.entity';
import { User } from '../../entities/user.entity';
import {
  CreatePermissionDto,
  CreateRoleDto,
  CreateUserDto,
  UpdatePermissionDto,
  UpdateRoleDto,
  UpdateUserDto,
} from './dto/admin.dto';
import { ADMIN_ROLE_CODE } from '../../common/decorators/permissions.decorator';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(Permission) private permRepo: Repository<Permission>,
    private auditService: AuditService,
  ) {}

  findAll() {
    return this.roleRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(dto: CreateRoleDto, actorId?: string) {
    const existing = await this.roleRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) throw new BadRequestException('Role code already exists');

    const permissions = dto.permissionIds?.length
      ? await this.permRepo.findBy({ id: In(dto.permissionIds) })
      : [];

    const role = await this.roleRepo.save(
      this.roleRepo.create({
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        permissions,
      }),
    );

    await this.auditService.log({
      entityType: 'role',
      entityId: role.id,
      action: 'created',
      actorId,
      source: 'portal',
      description: `Created role ${role.name}`,
      newValue: { code: role.code, name: role.name },
    });

    return role;
  }

  async update(id: string, dto: UpdateRoleDto, actorId?: string) {
    const role = await this.findOne(id);
    if (role.isSystem && role.code === ADMIN_ROLE_CODE) {
      throw new BadRequestException('Cannot modify system admin role');
    }

    const old = { name: role.name, description: role.description };
    if (dto.name) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.permissionIds) {
      role.permissions = await this.permRepo.findBy({
        id: In(dto.permissionIds),
      });
    }
    const saved = await this.roleRepo.save(role);

    await this.auditService.log({
      entityType: 'role',
      entityId: id,
      action: 'updated',
      actorId,
      source: 'portal',
      description: `Updated role ${saved.name}`,
      oldValue: old,
      newValue: dto as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async remove(id: string, actorId?: string) {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system role');
    }
    await this.roleRepo.remove(role);
    await this.auditService.log({
      entityType: 'role',
      entityId: id,
      action: 'deleted',
      actorId,
      source: 'portal',
      description: `Deleted role ${role.name}`,
      oldValue: { code: role.code, name: role.name },
    });
    return { deleted: true };
  }
}

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission) private permRepo: Repository<Permission>,
    private auditService: AuditService,
  ) {}

  findAll() {
    return this.permRepo.find({ order: { page: 'ASC', action: 'ASC' } });
  }

  async create(dto: CreatePermissionDto, actorId?: string) {
    const existing = await this.permRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) throw new BadRequestException('Permission code exists');

    const perm = await this.permRepo.save(this.permRepo.create(dto));
    await this.auditService.log({
      entityType: 'permission',
      entityId: perm.id,
      action: 'created',
      actorId,
      source: 'portal',
      description: `Created permission ${perm.code}`,
      newValue: { code: perm.code, page: perm.page, action: perm.action },
    });
    return perm;
  }

  async update(id: string, dto: UpdatePermissionDto, actorId?: string) {
    const perm = await this.permRepo.findOne({ where: { id } });
    if (!perm) throw new NotFoundException('Permission not found');

    const old = {
      code: perm.code,
      name: perm.name,
      page: perm.page,
      action: perm.action,
      description: perm.description,
    };

    if (dto.code && dto.code !== perm.code) {
      const existing = await this.permRepo.findOne({
        where: { code: dto.code },
      });
      if (existing) throw new BadRequestException('Permission code exists');
      perm.code = dto.code;
    }
    if (dto.name !== undefined) perm.name = dto.name;
    if (dto.page !== undefined) perm.page = dto.page;
    if (dto.action !== undefined) perm.action = dto.action;
    if (dto.description !== undefined) perm.description = dto.description;

    const saved = await this.permRepo.save(perm);
    await this.auditService.log({
      entityType: 'permission',
      entityId: id,
      action: 'updated',
      actorId,
      source: 'portal',
      description: `Updated permission ${saved.code}`,
      oldValue: old,
      newValue: {
        code: saved.code,
        name: saved.name,
        page: saved.page,
        action: saved.action,
      },
    });
    return saved;
  }

  async remove(id: string, actorId?: string) {
    const perm = await this.permRepo.findOne({ where: { id } });
    if (!perm) throw new NotFoundException('Permission not found');
    await this.permRepo.remove(perm);
    await this.auditService.log({
      entityType: 'permission',
      entityId: id,
      action: 'deleted',
      actorId,
      source: 'portal',
      description: `Deleted permission ${perm.code}`,
      oldValue: { code: perm.code },
    });
    return { deleted: true };
  }
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    private auditService: AuditService,
  ) {}

  async findAll() {
    const users = await this.userRepo.find({ order: { fullName: 'ASC' } });
    return users.map(({ passwordHash, ...rest }) => rest);
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async create(dto: CreateUserDto, actorId?: string) {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new BadRequestException('Email already exists');

    const roles = await this.roleRepo.findBy({ id: In(dto.roleIds) });
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      fullName: dto.fullName,
      employeeId: dto.employeeId ?? null,
      phone: dto.phone ?? null,
      nic: dto.nic ?? null,
      designation: dto.designation ?? null,
      address: dto.address ?? null,
      officeDetails: dto.officeDetails ?? null,
      province: dto.province ?? null,
      district: dto.district ?? null,
      isMobileUser: dto.isMobileUser ?? false,
      roles,
    });
    const saved = await this.userRepo.save(user);
    const { passwordHash: _, ...rest } = saved;

    await this.auditService.log({
      entityType: 'user',
      entityId: saved.id,
      action: 'created',
      actorId,
      source: 'portal',
      description: `Created user ${saved.email}${saved.isMobileUser ? ' (mobile)' : ''}`,
      newValue: {
        email: saved.email,
        fullName: saved.fullName,
        isMobileUser: saved.isMobileUser,
        roles: roles.map((r) => r.code),
      },
    });

    return rest;
  }

  async update(id: string, dto: UpdateUserDto, actorId?: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const old = {
      fullName: user.fullName,
      isActive: user.isActive,
      isMobileUser: user.isMobileUser,
    };

    if (dto.fullName) user.fullName = dto.fullName;
    if (dto.employeeId !== undefined) user.employeeId = dto.employeeId;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.nic !== undefined) user.nic = dto.nic;
    if (dto.designation !== undefined) user.designation = dto.designation;
    if (dto.address !== undefined) user.address = dto.address;
    if (dto.officeDetails !== undefined) user.officeDetails = dto.officeDetails;
    if (dto.province !== undefined) user.province = dto.province;
    if (dto.district !== undefined) user.district = dto.district;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.isMobileUser !== undefined) user.isMobileUser = dto.isMobileUser;
    if (dto.password) user.passwordHash = await bcrypt.hash(dto.password, 10);
    if (dto.roleIds) {
      user.roles = await this.roleRepo.findBy({ id: In(dto.roleIds) });
    }

    const saved = await this.userRepo.save(user);
    const { passwordHash, ...rest } = saved;

    await this.auditService.log({
      entityType: 'user',
      entityId: id,
      action: 'updated',
      actorId,
      source: 'portal',
      description: `Updated user ${saved.email}`,
      oldValue: old,
      newValue: {
        fullName: dto.fullName,
        isActive: dto.isActive,
        isMobileUser: dto.isMobileUser,
        passwordChanged: !!dto.password,
      },
    });

    return rest;
  }

  async remove(id: string, actorId?: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.isActive = false;
    await this.userRepo.save(user);
    await this.auditService.log({
      entityType: 'user',
      entityId: id,
      action: 'deactivated',
      actorId,
      source: 'portal',
      description: `Deactivated user ${user.email}`,
    });
    return { deleted: true };
  }
}
