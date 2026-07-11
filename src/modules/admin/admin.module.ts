import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { Permission } from '../../entities/permission.entity';
import {
  PermissionsService,
  RolesService,
  UsersService,
} from './admin.service';
import {
  PermissionsController,
  RolesController,
  UsersController,
} from './admin.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Permission]),
    AuditModule,
  ],
  controllers: [UsersController, RolesController, PermissionsController],
  providers: [UsersService, RolesService, PermissionsService],
  exports: [UsersService, RolesService, PermissionsService, AuditModule],
})
export class AdminModule {}
