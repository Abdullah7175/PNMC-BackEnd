import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  SupervisorService,
  SupervisorScope,
} from './supervisor.service';
import {
  AssignInspectionDto,
  SupervisorReviewDto,
} from '../inspections/dto/inspection.dto';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards/auth.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

type AuthUser = {
  id: string;
  province?: string | null;
  provinceId?: string | null;
  roles?: { code: string }[];
};

function toScope(user: AuthUser): SupervisorScope {
  const isAdmin = user.roles?.some((r) => r.code === 'admin') ?? false;
  return {
    isAdmin,
    provinceId: user.provinceId ?? null,
    province: user.province ?? null,
  };
}

@ApiTags('Supervisor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('supervisor')
export class SupervisorController {
  constructor(private readonly supervisorService: SupervisorService) {}

  private baseUrl(req: { protocol: string; get: (h: string) => string }) {
    return `${req.protocol}://${req.get('host')}`;
  }

  @Get('dashboard/stats')
  @RequirePermissions('dashboard.view')
  stats(@Req() req: { user: AuthUser }) {
    return this.supervisorService.getStats(toScope(req.user));
  }

  @Get('inspections')
  @RequirePermissions('inspections.view')
  findAll(
    @Query('status') status: string,
    @Query('province') province: string,
    @Query('district') district: string,
    @Req() req: {
      user: AuthUser;
      protocol: string;
      get: (h: string) => string;
    },
  ) {
    return this.supervisorService.findQueue(
      { status, province, district },
      this.baseUrl(req),
      toScope(req.user),
    );
  }

  @Get('inspections/:id')
  @RequirePermissions('inspections.view')
  findOne(
    @Param('id') id: string,
    @Req() req: {
      user: AuthUser;
      protocol: string;
      get: (h: string) => string;
    },
  ) {
    return this.supervisorService.findOne(
      id,
      this.baseUrl(req),
      toScope(req.user),
    );
  }

  @Patch('inspections/:id/review')
  @RequirePermissions('inspections.review')
  review(
    @Param('id') id: string,
    @Body() dto: SupervisorReviewDto,
    @Req() req: {
      user: AuthUser;
      protocol: string;
      get: (h: string) => string;
    },
  ) {
    return this.supervisorService.review(
      id,
      dto,
      req.user.id,
      this.baseUrl(req),
      toScope(req.user),
    );
  }
}

@ApiTags('Admin - Inspection Assignment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/inspections')
export class AdminInspectionsController {
  constructor(private readonly supervisorService: SupervisorService) {}

  @Post(':id/assign')
  @RequirePermissions('inspections.assign')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignInspectionDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.supervisorService.assign(
      id,
      dto.inspectorId,
      dto.supervisorId,
      req.user.id,
    );
  }
}
