import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InspectionsService } from '../inspections/inspections.service';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  UpdateRequirementDto,
  AddCommentDto,
  SubmitInspectionDto,
  UpdateFeeDetailsDto,
} from '../inspections/dto/inspection.dto';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards/auth.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { MasterDataService } from '../master-data/master-data.service';
import { AuditService } from '../audit/audit.service';
import { MobileService } from './mobile.service';

type AuthReq = {
  user: {
    id: string;
    fullName: string;
    isMobileUser?: boolean;
    provinceId?: string | null;
    districtId?: string | null;
    province?: string | null;
    district?: string | null;
    roles?: { code: string }[];
  };
  protocol: string;
  get: (h: string) => string;
};

const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Mobile — Field Inspector')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('mobile')
export class MobileController {
  constructor(
    private readonly inspectionsService: InspectionsService,
    private readonly masterDataService: MasterDataService,
    private readonly auditService: AuditService,
    private readonly mobileService: MobileService,
  ) {}

  private baseUrl(req: AuthReq) {
    return `${req.protocol}://${req.get('host')}`;
  }

  private assertMobileUser(req: AuthReq) {
    const isMobile =
      req.user.isMobileUser === true ||
      req.user.roles?.some((r) => r.code === 'field_inspector');
    if (!isMobile) {
      throw new ForbiddenException(
        'This endpoint is only available to mobile field users',
      );
    }
  }

  /**
   * Org assignment: province, district, and province supervisor(s).
   */
  @Get('assignment')
  @RequirePermissions('mobile.inspections.view')
  assignment(@Req() req: AuthReq) {
    this.assertMobileUser(req);
    return this.mobileService.getAssignment(req.user.id);
  }

  @Get('lookups')
  @RequirePermissions('mobile.inspections.view')
  lookups(@Req() req: AuthReq) {
    this.assertMobileUser(req);
    return this.mobileService.getScopedLookups(req.user.id);
  }

  @Get('lookups/provinces')
  @RequirePermissions('mobile.inspections.view')
  provinces(@Req() req: AuthReq) {
    this.assertMobileUser(req);
    return this.mobileService.getScopedProvinces(req.user.id);
  }

  @Get('lookups/provinces/:provinceId/districts')
  @RequirePermissions('mobile.inspections.view')
  districtsByProvince(
    @Param('provinceId', uuid()) provinceId: string,
    @Req() req: AuthReq,
  ) {
    this.assertMobileUser(req);
    return this.mobileService.getScopedDistricts(req.user.id, provinceId);
  }

  @Get('lookups/applied-for')
  @RequirePermissions('mobile.inspections.view')
  appliedFor(@Req() req: AuthReq) {
    this.assertMobileUser(req);
    return this.masterDataService.findAppliedFor(true).then((list) =>
      list.map((a) => ({
        id: a.id,
        name: a.name,
        code: a.code,
        description: a.description,
      })),
    );
  }

  @Get('lookups/inspection-types')
  @RequirePermissions('mobile.inspections.view')
  inspectionTypes(@Req() req: AuthReq) {
    this.assertMobileUser(req);
    return this.masterDataService.getInspectionTypes();
  }

  @Get('inspections')
  @RequirePermissions('mobile.inspections.view')
  list(@Req() req: AuthReq) {
    this.assertMobileUser(req);
    return this.inspectionsService.findAllForInspector(
      req.user.id,
      this.baseUrl(req),
    );
  }

  @Get('inspections/:id')
  @RequirePermissions('mobile.inspections.view')
  getOne(@Param('id', uuid()) id: string, @Req() req: AuthReq) {
    this.assertMobileUser(req);
    return this.inspectionsService.findOneForOwner(
      id,
      req.user.id,
      this.baseUrl(req),
    );
  }

  @Post('inspections')
  @RequirePermissions('mobile.inspections.create')
  async create(@Body() dto: CreateInspectionDto, @Req() req: AuthReq) {
    this.assertMobileUser(req);
    const scoped = await this.mobileService.applyLocationScopeToCreate(
      req.user.id,
      dto,
    );
    return this.inspectionsService.create(
      scoped,
      req.user.id,
      this.baseUrl(req),
      'mobile',
    );
  }

  @Patch('inspections/:id')
  @RequirePermissions('mobile.inspections.update')
  async update(
    @Param('id', uuid()) id: string,
    @Body() dto: UpdateInspectionDto,
    @Req() req: AuthReq,
  ) {
    this.assertMobileUser(req);
    const scoped = await this.mobileService.applyLocationScopeToUpdate(
      req.user.id,
      dto,
    );
    return this.inspectionsService.update(
      id,
      scoped,
      req.user.id,
      this.baseUrl(req),
      'mobile',
    );
  }

  @Patch('inspections/:id/fee-details')
  @RequirePermissions('mobile.inspections.update')
  updateFee(
    @Param('id', uuid()) id: string,
    @Body() dto: UpdateFeeDetailsDto,
    @Req() req: AuthReq,
  ) {
    this.assertMobileUser(req);
    return this.inspectionsService.updateFeeDetails(
      id,
      dto,
      req.user.id,
      this.baseUrl(req),
      'mobile',
    );
  }

  @Patch('inspections/:id/requirements/:responseId')
  @RequirePermissions('mobile.inspections.update')
  updateRequirement(
    @Param('id', uuid()) id: string,
    @Param('responseId', uuid()) responseId: string,
    @Body() dto: UpdateRequirementDto,
    @Req() req: AuthReq,
  ) {
    this.assertMobileUser(req);
    return this.inspectionsService.updateRequirement(
      id,
      responseId,
      dto,
      req.user.id,
      this.baseUrl(req),
      'mobile',
    );
  }

  @Post('inspections/:id/requirements/:responseId/comments')
  @RequirePermissions('mobile.inspections.update')
  addComment(
    @Param('id', uuid()) id: string,
    @Param('responseId', uuid()) responseId: string,
    @Body() dto: AddCommentDto,
    @Req() req: AuthReq,
  ) {
    this.assertMobileUser(req);
    return this.inspectionsService.addComment(
      id,
      responseId,
      dto,
      req.user,
      this.baseUrl(req),
      'mobile',
    );
  }

  @Post('inspections/:id/requirements/:responseId/attachments')
  @RequirePermissions('mobile.inspections.update')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  addAttachment(
    @Param('id', uuid()) id: string,
    @Param('responseId', uuid()) responseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthReq,
  ) {
    this.assertMobileUser(req);
    return this.inspectionsService.addAttachment(
      id,
      responseId,
      file,
      req.user.id,
      this.baseUrl(req),
      'mobile',
    );
  }

  @Delete('inspections/:id/attachments/:attachmentId')
  @RequirePermissions('mobile.inspections.update')
  removeAttachment(
    @Param('id', uuid()) id: string,
    @Param('attachmentId', uuid()) attachmentId: string,
    @Req() req: AuthReq,
  ) {
    this.assertMobileUser(req);
    return this.inspectionsService.deleteAttachment(
      id,
      attachmentId,
      req.user.id,
      this.baseUrl(req),
      'mobile',
    );
  }

  @Post('inspections/:id/signature')
  @RequirePermissions('mobile.inspections.update')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 512 * 1024, files: 1 },
    }),
  )
  uploadSignature(
    @Param('id', uuid()) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthReq,
  ) {
    this.assertMobileUser(req);
    return this.inspectionsService.uploadSignature(
      id,
      file,
      req.user.id,
      this.baseUrl(req),
      'mobile',
    );
  }

  @Post('inspections/:id/submit')
  @RequirePermissions('mobile.inspections.submit')
  submit(
    @Param('id', uuid()) id: string,
    @Body() dto: SubmitInspectionDto,
    @Req() req: AuthReq,
  ) {
    this.assertMobileUser(req);
    return this.inspectionsService.submit(
      id,
      dto,
      req.user.id,
      this.baseUrl(req),
      'mobile',
    );
  }

  @Get('activity')
  @RequirePermissions('mobile.inspections.view')
  activity(@Req() req: AuthReq) {
    this.assertMobileUser(req);
    return this.auditService.findForActor(req.user.id, 50);
  }
}
