import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
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

type AuthReq = {
  user: {
    id: string;
    fullName: string;
    isMobileUser?: boolean;
    roles?: { code: string }[];
  };
  protocol: string;
  get: (h: string) => string;
};

@ApiTags('Mobile — Field Inspector')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('mobile')
export class MobileController {
  constructor(
    private readonly inspectionsService: InspectionsService,
    private readonly masterDataService: MasterDataService,
    private readonly auditService: AuditService,
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

  // ── Lookups for form dropdowns ─────────────────────────────

  @Get('lookups')
  @RequirePermissions('mobile.inspections.view')
  lookups(@Req() req: AuthReq) {
    this.assertMobileUser(req);
    return this.masterDataService.getMobileLookups();
  }

  @Get('lookups/provinces')
  @RequirePermissions('mobile.inspections.view')
  provinces(@Req() req: AuthReq) {
    this.assertMobileUser(req);
    return this.masterDataService.findProvinces(true).then((list) =>
      list.map((p) => ({ id: p.id, name: p.name, code: p.code })),
    );
  }

  @Get('lookups/provinces/:provinceId/districts')
  @RequirePermissions('mobile.inspections.view')
  districtsByProvince(
    @Param('provinceId') provinceId: string,
    @Req() req: AuthReq,
  ) {
    this.assertMobileUser(req);
    return this.masterDataService.findDistricts(provinceId, true).then((list) =>
      list.map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        provinceId: d.provinceId,
      })),
    );
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
  getOne(@Param('id') id: string, @Req() req: AuthReq) {
    this.assertMobileUser(req);
    return this.inspectionsService.findOneForOwner(
      id,
      req.user.id,
      this.baseUrl(req),
    );
  }

  @Post('inspections')
  @RequirePermissions('mobile.inspections.create')
  create(@Body() dto: CreateInspectionDto, @Req() req: AuthReq) {
    this.assertMobileUser(req);
    return this.inspectionsService.create(
      dto,
      req.user.id,
      this.baseUrl(req),
      'mobile',
    );
  }

  /** Partial save — institute / principal header fields */
  @Patch('inspections/:id')
  @RequirePermissions('mobile.inspections.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInspectionDto,
    @Req() req: AuthReq,
  ) {
    this.assertMobileUser(req);
    return this.inspectionsService.update(
      id,
      dto,
      req.user.id,
      this.baseUrl(req),
      'mobile',
    );
  }

  @Patch('inspections/:id/fee-details')
  @RequirePermissions('mobile.inspections.update')
  updateFee(
    @Param('id') id: string,
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
    @Param('id') id: string,
    @Param('responseId') responseId: string,
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
    @Param('id') id: string,
    @Param('responseId') responseId: string,
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
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  addAttachment(
    @Param('id') id: string,
    @Param('responseId') responseId: string,
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
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
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
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadSignature(
    @Param('id') id: string,
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
    @Param('id') id: string,
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

  /** Own activity history (read-only) */
  @Get('activity')
  @RequirePermissions('mobile.inspections.view')
  activity(@Req() req: AuthReq) {
    this.assertMobileUser(req);
    return this.auditService.findForActor(req.user.id, 50);
  }
}
