import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  PermissionsService,
  RolesService,
  UsersService,
} from './admin.service';
import {
  CreatePermissionDto,
  CreateRoleDto,
  CreateUserDto,
  UpdatePermissionDto,
  UpdateRoleDto,
  UpdateUserDto,
} from './dto/admin.dto';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards/auth.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

type AuthReq = { user: { id: string } };

@ApiTags('Admin - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.view')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequirePermissions('users.view')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions('users.create')
  create(@Body() dto: CreateUserDto, @Req() req: AuthReq) {
    return this.usersService.create(dto, req.user.id);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: AuthReq,
  ) {
    return this.usersService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  remove(@Param('id') id: string, @Req() req: AuthReq) {
    return this.usersService.remove(id, req.user.id);
  }
}

@ApiTags('Admin - Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles.view')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermissions('roles.view')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @RequirePermissions('roles.create')
  create(@Body() dto: CreateRoleDto, @Req() req: AuthReq) {
    return this.rolesService.create(dto, req.user.id);
  }

  @Patch(':id')
  @RequirePermissions('roles.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: AuthReq,
  ) {
    return this.rolesService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('roles.delete')
  remove(@Param('id') id: string, @Req() req: AuthReq) {
    return this.rolesService.remove(id, req.user.id);
  }
}

@ApiTags('Admin - Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('permissions.view')
  findAll() {
    return this.permissionsService.findAll();
  }

  @Post()
  @RequirePermissions('permissions.create')
  create(@Body() dto: CreatePermissionDto, @Req() req: AuthReq) {
    return this.permissionsService.create(dto, req.user.id);
  }

  @Patch(':id')
  @RequirePermissions('permissions.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
    @Req() req: AuthReq,
  ) {
    return this.permissionsService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('permissions.delete')
  remove(@Param('id') id: string, @Req() req: AuthReq) {
    return this.permissionsService.remove(id, req.user.id);
  }
}
