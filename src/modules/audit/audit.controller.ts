import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards/auth.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Admin - Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit-logs.view')
  findAll(
    @Query('limit') limit?: string,
    @Query('source') source?: string,
    @Query('actorId') actorId?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.auditService.findAll({
      limit: limit ? parseInt(limit, 10) : 200,
      source,
      actorId,
      entityType,
    });
  }
}
