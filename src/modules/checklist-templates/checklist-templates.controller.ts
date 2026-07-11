import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ChecklistTemplatesService } from './checklist-templates.service';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards/auth.guard';
import { Public, RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Checklist Templates')
@Controller('checklist-templates')
export class ChecklistTemplatesController {
  constructor(private readonly service: ChecklistTemplatesService) {}

  @Public()
  @Get('active')
  getActive() {
    return this.service.getActive();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  @RequirePermissions('checklist-templates.view')
  findAll() {
    return this.service.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  @RequirePermissions('checklist-templates.view')
  findOne(@Param('id') id: string) {
    return this.service.findAll().then((list) => list.find((t) => t.id === id));
  }
}
