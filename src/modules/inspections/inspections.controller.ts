import {
  Body,
  Controller,
  Delete,
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
import { InspectionsService } from './inspections.service';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  UpdateRequirementDto,
  AddCommentDto,
  SubmitInspectionDto,
} from './dto/inspection.dto';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards/auth.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Inspections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  private baseUrl(req: { protocol: string; get: (h: string) => string }) {
    return `${req.protocol}://${req.get('host')}`;
  }

  @Get()
  @RequirePermissions('inspections.view')
  findMine(@Req() req: { user: { id: string }; protocol: string; get: (h: string) => string }) {
    return this.inspectionsService.findAllForInspector(
      req.user.id,
      this.baseUrl(req),
    );
  }

  @Get(':id')
  @RequirePermissions('inspections.view')
  findOne(
    @Param('id') id: string,
    @Req() req: { protocol: string; get: (h: string) => string },
  ) {
    return this.inspectionsService.findOne(id, this.baseUrl(req));
  }

  @Post()
  @RequirePermissions('inspections.create')
  create(
    @Body() dto: CreateInspectionDto,
    @Req() req: { user: { id: string }; protocol: string; get: (h: string) => string },
  ) {
    return this.inspectionsService.create(dto, req.user.id, this.baseUrl(req));
  }

  @Patch(':id')
  @RequirePermissions('inspections.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInspectionDto,
    @Req() req: { user: { id: string }; protocol: string; get: (h: string) => string },
  ) {
    return this.inspectionsService.update(id, dto, req.user.id, this.baseUrl(req));
  }

  @Patch(':id/requirements/:responseId')
  @RequirePermissions('inspections.update')
  updateRequirement(
    @Param('id') id: string,
    @Param('responseId') responseId: string,
    @Body() dto: UpdateRequirementDto,
    @Req() req: { user: { id: string }; protocol: string; get: (h: string) => string },
  ) {
    return this.inspectionsService.updateRequirement(
      id,
      responseId,
      dto,
      req.user.id,
      this.baseUrl(req),
    );
  }

  @Post(':id/requirements/:responseId/comments')
  @RequirePermissions('inspections.update')
  addComment(
    @Param('id') id: string,
    @Param('responseId') responseId: string,
    @Body() dto: AddCommentDto,
    @Req() req: { user: { id: string; fullName: string }; protocol: string; get: (h: string) => string },
  ) {
    return this.inspectionsService.addComment(
      id,
      responseId,
      dto,
      req.user,
      this.baseUrl(req),
    );
  }

  @Post(':id/requirements/:responseId/attachments')
  @RequirePermissions('inspections.update')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  addAttachment(
    @Param('id') id: string,
    @Param('responseId') responseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: { id: string }; protocol: string; get: (h: string) => string },
  ) {
    return this.inspectionsService.addAttachment(
      id,
      responseId,
      file,
      req.user.id,
      this.baseUrl(req),
    );
  }

  @Delete(':id/attachments/:attachmentId')
  @RequirePermissions('inspections.update')
  removeAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: { user: { id: string }; protocol: string; get: (h: string) => string },
  ) {
    return this.inspectionsService.deleteAttachment(
      id,
      attachmentId,
      req.user.id,
      this.baseUrl(req),
    );
  }

  @Post(':id/signature')
  @RequirePermissions('inspections.update')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadSignature(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: { id: string }; protocol: string; get: (h: string) => string },
  ) {
    return this.inspectionsService.uploadSignature(
      id,
      file,
      req.user.id,
      this.baseUrl(req),
    );
  }

  @Post(':id/submit')
  @RequirePermissions('inspections.submit')
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitInspectionDto,
    @Req() req: { user: { id: string }; protocol: string; get: (h: string) => string },
  ) {
    return this.inspectionsService.submit(id, dto, req.user.id, this.baseUrl(req));
  }
}
