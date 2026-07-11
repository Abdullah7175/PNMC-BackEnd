import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MasterDataService } from './master-data.service';
import {
  CreateProvinceDto,
  UpdateProvinceDto,
  CreateDistrictDto,
  UpdateDistrictDto,
  CreateAppliedForDto,
  UpdateAppliedForDto,
} from './dto/master-data.dto';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards/auth.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

type AuthReq = { user: { id: string } };

@ApiTags('Admin - Locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/provinces')
export class ProvincesController {
  constructor(private readonly masterData: MasterDataService) {}

  @Get()
  @RequirePermissions('locations.view')
  findAll() {
    return this.masterData.findProvinces();
  }

  @Get(':id')
  @RequirePermissions('locations.view')
  findOne(@Param('id') id: string) {
    return this.masterData.findProvince(id);
  }

  @Post()
  @RequirePermissions('locations.create')
  create(@Body() dto: CreateProvinceDto, @Req() req: AuthReq) {
    return this.masterData.createProvince(dto, req.user.id);
  }

  @Patch(':id')
  @RequirePermissions('locations.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProvinceDto,
    @Req() req: AuthReq,
  ) {
    return this.masterData.updateProvince(id, dto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('locations.delete')
  remove(@Param('id') id: string, @Req() req: AuthReq) {
    return this.masterData.deleteProvince(id, req.user.id);
  }
}

@ApiTags('Admin - Locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/districts')
export class DistrictsController {
  constructor(private readonly masterData: MasterDataService) {}

  @Get()
  @RequirePermissions('locations.view')
  findAll(@Query('provinceId') provinceId?: string) {
    return this.masterData.findDistricts(provinceId);
  }

  @Get(':id')
  @RequirePermissions('locations.view')
  findOne(@Param('id') id: string) {
    return this.masterData.findDistrict(id);
  }

  @Post()
  @RequirePermissions('locations.create')
  create(@Body() dto: CreateDistrictDto, @Req() req: AuthReq) {
    return this.masterData.createDistrict(dto, req.user.id);
  }

  @Patch(':id')
  @RequirePermissions('locations.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDistrictDto,
    @Req() req: AuthReq,
  ) {
    return this.masterData.updateDistrict(id, dto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('locations.delete')
  remove(@Param('id') id: string, @Req() req: AuthReq) {
    return this.masterData.deleteDistrict(id, req.user.id);
  }
}

@ApiTags('Admin - Applied For')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/applied-for')
export class AppliedForController {
  constructor(private readonly masterData: MasterDataService) {}

  @Get()
  @RequirePermissions('applied-for.view')
  findAll() {
    return this.masterData.findAppliedFor();
  }

  @Get(':id')
  @RequirePermissions('applied-for.view')
  findOne(@Param('id') id: string) {
    return this.masterData.findAppliedForOne(id);
  }

  @Post()
  @RequirePermissions('applied-for.create')
  create(@Body() dto: CreateAppliedForDto, @Req() req: AuthReq) {
    return this.masterData.createAppliedFor(dto, req.user.id);
  }

  @Patch(':id')
  @RequirePermissions('applied-for.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAppliedForDto,
    @Req() req: AuthReq,
  ) {
    return this.masterData.updateAppliedFor(id, dto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('applied-for.delete')
  remove(@Param('id') id: string, @Req() req: AuthReq) {
    return this.masterData.deleteAppliedFor(id, req.user.id);
  }
}
