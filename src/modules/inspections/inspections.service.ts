import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inspection } from '../../entities/inspection.entity';
import { ChecklistTemplate } from '../../entities/checklist-template.entity';
import { InspectionRequirementResponse } from '../../entities/inspection-requirement-response.entity';
import { RequirementComment } from '../../entities/requirement-comment.entity';
import { RequirementAttachment } from '../../entities/requirement-attachment.entity';
import {
  InspectionFeeDetail,
  FeeLineItem,
} from '../../entities/inspection-fee-detail.entity';
import { InspectionStatus } from '../../common/enums/inspection.enum';
import { RequirementStatus } from '../../common/enums/requirement.enum';
import { DEFAULT_FEE_LINE_ITEMS } from '../../common/constants/official-checklist';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  UpdateRequirementDto,
  AddCommentDto,
  SubmitInspectionDto,
  UpdateFeeDetailsDto,
} from './dto/inspection.dto';
import { AuditService } from '../audit/audit.service';
import type { AuditSource } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { MasterDataService } from '../master-data/master-data.service';

@Injectable()
export class InspectionsService {
  constructor(
    @InjectRepository(Inspection)
    private inspectionRepo: Repository<Inspection>,
    @InjectRepository(ChecklistTemplate)
    private templateRepo: Repository<ChecklistTemplate>,
    @InjectRepository(InspectionRequirementResponse)
    private responseRepo: Repository<InspectionRequirementResponse>,
    @InjectRepository(RequirementComment)
    private commentRepo: Repository<RequirementComment>,
    @InjectRepository(RequirementAttachment)
    private attachmentRepo: Repository<RequirementAttachment>,
    @InjectRepository(InspectionFeeDetail)
    private feeRepo: Repository<InspectionFeeDetail>,
    private auditService: AuditService,
    private storageService: StorageService,
    private masterDataService: MasterDataService,
  ) {}

  private async resolveLocationFields(dto: {
    provinceId?: string;
    districtId?: string;
    appliedForId?: string;
    province?: string;
    district?: string;
    appliedFor?: string;
  }) {
    let province = dto.province ?? null;
    let district = dto.district ?? null;
    let appliedFor = dto.appliedFor ?? null;
    let provinceId = dto.provinceId ?? null;
    let districtId = dto.districtId ?? null;
    let appliedForId = dto.appliedForId ?? null;

    if (provinceId) {
      const p = await this.masterDataService.findProvince(provinceId);
      province = p.name;
      provinceId = p.id;
    }
    if (districtId) {
      const d = await this.masterDataService.findDistrict(districtId);
      district = d.name;
      districtId = d.id;
      if (!provinceId) {
        provinceId = d.provinceId;
        province = d.province?.name ?? province;
      }
    }
    if (appliedForId) {
      const a = await this.masterDataService.findAppliedForOne(appliedForId);
      appliedFor = a.name;
      appliedForId = a.id;
    }

    return { province, district, appliedFor, provinceId, districtId, appliedForId };
  }

  private async generateInspectionCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.inspectionRepo.count();
    return `PNMC-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  mapInspection(inspection: Inspection, baseUrl: string) {
    const requirements = (inspection.requirements ?? [])
      .sort((a, b) => a.requirementNumber - b.requirementNumber)
      .map((r) => ({
        id: r.id,
        requirementId: r.requirementId,
        number: r.requirementNumber,
        flag: r.requirement?.flag,
        category: r.requirement?.category,
        title: r.requirement?.title,
        provision: r.requirement?.provision,
        regulationRef: r.requirement?.regulationRef,
        hasFeeDetails: r.requirement?.hasFeeDetails ?? false,
        status: r.status,
        comments: (r.comments ?? []).map((c) => ({
          id: c.id,
          author: c.authorName,
          authorId: c.authorId,
          text: c.text,
          timestamp: c.createdAt,
        })),
        attachments: (r.attachments ?? []).map((a) => ({
          id: a.id,
          fileName: a.fileName,
          url: this.storageService.getPublicUrl(a.filePath, baseUrl),
          mimeType: a.mimeType,
          createdAt: a.createdAt,
        })),
      }));

    const reviewed = requirements.filter((r) => r.status !== 'pending');
    const okCount = requirements.filter((r) => r.status === 'ok').length;
    const rejectCount = requirements.filter((r) => r.status === 'reject').length;
    const total = requirements.length || 23;
    const fee = inspection.feeDetail;

    return {
      id: inspection.id,
      inspectionCode: inspection.inspectionCode,
      instituteName: inspection.instituteName,
      district: inspection.district,
      province: inspection.province,
      provinceId: inspection.provinceId,
      districtId: inspection.districtId,
      inspectionDate: inspection.inspectionDate,
      appliedFor: inspection.appliedFor,
      appliedForId: inspection.appliedForId,
      type: inspection.inspectionType,
      principalName: inspection.principalName,
      principalRegNo: inspection.principalRegNo,
      principalQualification: inspection.principalQualification,
      assignedDate: inspection.assignedDate,
      finalRemarks: inspection.finalRemarks ?? '',
      status: inspection.status,
      isSubmitted: ![
        InspectionStatus.DRAFT,
        InspectionStatus.IN_PROGRESS,
        InspectionStatus.CHANGES_REQUESTED,
      ].includes(inspection.status),
      canEdit: [
        InspectionStatus.DRAFT,
        InspectionStatus.IN_PROGRESS,
        InspectionStatus.CHANGES_REQUESTED,
      ].includes(inspection.status),
      submittedAt: inspection.submittedAt,
      signatureUrl: inspection.signatureFilePath
        ? this.storageService.getPublicUrl(inspection.signatureFilePath, baseUrl)
        : null,
      supervisorRemarks: inspection.supervisorRemarks,
      reviewedAt: inspection.reviewedAt,
      inspectorId: inspection.inspectorId,
      inspectorName: inspection.inspector?.fullName ?? null,
      supervisorId: inspection.supervisorId,
      feeDetails: fee
        ? {
            id: fee.id,
            lineItems: fee.lineItems,
            totalPayable: fee.totalPayable,
            paidAmount: fee.paidAmount,
            challanReference: fee.challanReference,
            bankAccount: fee.bankAccount,
            notes: fee.notes,
          }
        : null,
      requirements,
      progress: {
        reviewedCount: reviewed.length,
        totalRequirements: total,
        okCount,
        rejectCount,
        percent: Math.round((reviewed.length / total) * 100),
      },
      createdAt: inspection.createdAt,
      updatedAt: inspection.updatedAt,
    };
  }

  private async loadInspection(id: string) {
    const inspection = await this.inspectionRepo.findOne({
      where: { id },
      relations: {
        requirements: { requirement: true, comments: true, attachments: true },
        inspector: true,
        supervisor: true,
        feeDetail: true,
      },
    });
    if (!inspection) throw new NotFoundException('Inspection not found');
    return inspection;
  }

  private assertEditable(inspection: Inspection) {
    const editable = [
      InspectionStatus.DRAFT,
      InspectionStatus.IN_PROGRESS,
      InspectionStatus.CHANGES_REQUESTED,
    ];
    if (!editable.includes(inspection.status)) {
      throw new ForbiddenException(
        'Inspection is locked. After submit you can only view status and details.',
      );
    }
  }

  private assertOwner(inspection: Inspection, userId: string) {
    if (inspection.inspectorId !== userId) {
      throw new ForbiddenException('Not your inspection');
    }
  }

  async findAllForInspector(inspectorId: string, baseUrl: string) {
    const list = await this.inspectionRepo.find({
      where: { inspectorId },
      relations: {
        requirements: { requirement: true, comments: true, attachments: true },
        feeDetail: true,
        inspector: true,
      },
      order: { createdAt: 'DESC' },
    });
    return list.map((i) => this.mapInspection(i, baseUrl));
  }

  async findOne(id: string, baseUrl: string) {
    return this.mapInspection(await this.loadInspection(id), baseUrl);
  }

  async findOneForOwner(id: string, userId: string, baseUrl: string) {
    const inspection = await this.loadInspection(id);
    this.assertOwner(inspection, userId);
    return this.mapInspection(inspection, baseUrl);
  }

  async create(
    dto: CreateInspectionDto,
    inspectorId: string,
    baseUrl: string,
    source: AuditSource = 'portal',
  ) {
    const template = await this.templateRepo.findOne({
      where: { isActive: true },
      relations: { requirements: true },
    });
    if (!template) {
      throw new BadRequestException('No active checklist template found');
    }

    const inspectionCode = await this.generateInspectionCode();
    const today = new Date().toISOString().split('T')[0];
    const location = await this.resolveLocationFields(dto);

    const inspection = this.inspectionRepo.create({
      id: dto.clientId ?? undefined,
      inspectionCode,
      templateId: template.id,
      templateVersion: template.version,
      inspectorId,
      instituteName: dto.instituteName,
      district: location.district,
      province: location.province,
      provinceId: location.provinceId,
      districtId: location.districtId,
      appliedFor: location.appliedFor,
      appliedForId: location.appliedForId,
      inspectionType: dto.type,
      inspectionDate: dto.inspectionDate?.split('T')[0] ?? today,
      assignedDate: today,
      principalName: dto.principalName ?? null,
      principalRegNo: dto.principalRegNo ?? null,
      principalQualification: dto.principalQualification ?? null,
      status: InspectionStatus.DRAFT,
    });

    const saved = await this.inspectionRepo.save(inspection);

    const responses = template.requirements
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((req) =>
        this.responseRepo.create({
          inspectionId: saved.id,
          requirementId: req.id,
          requirementNumber: req.number,
          status: RequirementStatus.PENDING,
        }),
      );
    await this.responseRepo.save(responses);

    await this.feeRepo.save(
      this.feeRepo.create({
        inspectionId: saved.id,
        lineItems: DEFAULT_FEE_LINE_ITEMS as FeeLineItem[],
        bankAccount: 'PK44MPBL9737477140108727',
        totalPayable: null,
        paidAmount: null,
        challanReference: null,
        notes: null,
      }),
    );

    await this.auditService.log({
      entityType: 'inspection',
      entityId: saved.id,
      action: 'created',
      actorId: inspectorId,
      source,
      description: `Created inspection ${inspectionCode} for ${dto.instituteName}`,
      newValue: {
        inspectionCode,
        instituteName: dto.instituteName,
        type: dto.type,
      },
    });
    return this.findOne(saved.id, baseUrl);
  }

  async update(
    id: string,
    dto: UpdateInspectionDto,
    userId: string,
    baseUrl: string,
    source: AuditSource = 'portal',
  ) {
    const inspection = await this.loadInspection(id);
    this.assertEditable(inspection);
    this.assertOwner(inspection, userId);

    const location = await this.resolveLocationFields({
      provinceId: dto.provinceId,
      districtId: dto.districtId,
      appliedForId: dto.appliedForId,
      province: dto.province,
      district: dto.district,
      appliedFor: dto.appliedFor,
    });

    Object.assign(inspection, {
      instituteName: dto.instituteName ?? inspection.instituteName,
      district:
        dto.districtId || dto.district !== undefined
          ? location.district
          : inspection.district,
      province:
        dto.provinceId || dto.province !== undefined
          ? location.province
          : inspection.province,
      provinceId:
        dto.provinceId || dto.districtId
          ? location.provinceId
          : dto.province !== undefined
            ? location.provinceId
            : inspection.provinceId,
      districtId:
        dto.districtId || dto.district !== undefined
          ? location.districtId
          : inspection.districtId,
      appliedFor:
        dto.appliedForId || dto.appliedFor !== undefined
          ? location.appliedFor
          : inspection.appliedFor,
      appliedForId:
        dto.appliedForId || dto.appliedFor !== undefined
          ? location.appliedForId
          : inspection.appliedForId,
      inspectionType: dto.type ?? inspection.inspectionType,
      principalName: dto.principalName ?? inspection.principalName,
      principalRegNo: dto.principalRegNo ?? inspection.principalRegNo,
      principalQualification:
        dto.principalQualification ?? inspection.principalQualification,
      inspectionDate:
        dto.inspectionDate?.split('T')[0] ?? inspection.inspectionDate,
      finalRemarks:
        dto.finalRemarks !== undefined
          ? dto.finalRemarks
          : inspection.finalRemarks,
    });

    if (inspection.status === InspectionStatus.DRAFT) {
      inspection.status = InspectionStatus.IN_PROGRESS;
    }

    await this.inspectionRepo.save(inspection);
    await this.auditService.log({
      entityType: 'inspection',
      entityId: id,
      action: 'updated',
      actorId: userId,
      source,
      description: `Updated inspection header ${inspection.inspectionCode}`,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return this.findOne(id, baseUrl);
  }

  async updateFeeDetails(
    inspectionId: string,
    dto: UpdateFeeDetailsDto,
    userId: string,
    baseUrl: string,
    source: AuditSource = 'portal',
  ) {
    const inspection = await this.loadInspection(inspectionId);
    this.assertEditable(inspection);
    this.assertOwner(inspection, userId);

    let fee = inspection.feeDetail;
    if (!fee) {
      fee = this.feeRepo.create({
        inspectionId,
        lineItems: DEFAULT_FEE_LINE_ITEMS as FeeLineItem[],
        bankAccount: 'PK44MPBL9737477140108727',
      });
    }

    if (dto.lineItems) fee.lineItems = dto.lineItems as FeeLineItem[];
    if (dto.totalPayable !== undefined)
      fee.totalPayable =
        dto.totalPayable === null ? null : String(dto.totalPayable);
    if (dto.paidAmount !== undefined)
      fee.paidAmount = dto.paidAmount === null ? null : String(dto.paidAmount);
    if (dto.challanReference !== undefined)
      fee.challanReference = dto.challanReference;
    if (dto.bankAccount !== undefined) fee.bankAccount = dto.bankAccount;
    if (dto.notes !== undefined) fee.notes = dto.notes;

    await this.feeRepo.save(fee);

    if (inspection.status === InspectionStatus.DRAFT) {
      inspection.status = InspectionStatus.IN_PROGRESS;
      await this.inspectionRepo.save(inspection);
    }

    await this.auditService.log({
      entityType: 'inspection',
      entityId: inspectionId,
      action: 'fee_details_updated',
      actorId: userId,
      source,
      description: `Updated fee details for ${inspection.inspectionCode}`,
      newValue: {
        totalPayable: dto.totalPayable,
        paidAmount: dto.paidAmount,
        challanReference: dto.challanReference,
      },
    });

    return this.findOne(inspectionId, baseUrl);
  }

  async updateRequirement(
    inspectionId: string,
    responseId: string,
    dto: UpdateRequirementDto,
    userId: string,
    baseUrl: string,
    source: AuditSource = 'portal',
  ) {
    const inspection = await this.loadInspection(inspectionId);
    this.assertEditable(inspection);
    this.assertOwner(inspection, userId);

    const response = inspection.requirements.find((r) => r.id === responseId);
    if (!response) throw new NotFoundException('Requirement response not found');

    response.status = dto.status;
    response.reviewedAt =
      dto.status !== RequirementStatus.PENDING ? new Date() : null;
    await this.responseRepo.save(response);

    if (inspection.status === InspectionStatus.DRAFT) {
      inspection.status = InspectionStatus.IN_PROGRESS;
      await this.inspectionRepo.save(inspection);
    }

    await this.auditService.log({
      entityType: 'requirement_response',
      entityId: responseId,
      action: 'status_updated',
      actorId: userId,
      source,
      description: `Set requirement #${response.requirementNumber} to ${dto.status} on ${inspection.inspectionCode}`,
      newValue: { status: dto.status, inspectionId },
    });

    return this.findOne(inspectionId, baseUrl);
  }

  async addComment(
    inspectionId: string,
    responseId: string,
    dto: AddCommentDto,
    user: { id: string; fullName: string },
    baseUrl: string,
    source: AuditSource = 'portal',
  ) {
    const inspection = await this.loadInspection(inspectionId);
    this.assertEditable(inspection);
    this.assertOwner(inspection, user.id);

    const response = inspection.requirements.find((r) => r.id === responseId);
    if (!response) throw new NotFoundException('Requirement response not found');

    await this.commentRepo.save(
      this.commentRepo.create({
        responseId,
        authorId: user.id,
        authorName: user.fullName,
        text: dto.text,
      }),
    );
    await this.auditService.log({
      entityType: 'requirement_comment',
      entityId: responseId,
      action: 'comment_added',
      actorId: user.id,
      actorName: user.fullName,
      source,
      description: `Added comment on inspection ${inspection.inspectionCode}`,
      newValue: { text: dto.text, inspectionId },
    });
    return this.findOne(inspectionId, baseUrl);
  }

  async addAttachment(
    inspectionId: string,
    responseId: string,
    file: Express.Multer.File,
    userId: string,
    baseUrl: string,
    source: AuditSource = 'portal',
  ) {
    const inspection = await this.loadInspection(inspectionId);
    this.assertEditable(inspection);
    this.assertOwner(inspection, userId);
    this.storageService.validateEvidenceFile(file);

    const response = inspection.requirements.find((r) => r.id === responseId);
    if (!response) throw new NotFoundException('Requirement response not found');

    const stored = this.storageService.saveFile(
      inspectionId,
      `requirements/${responseId}`,
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    await this.attachmentRepo.save(
      this.attachmentRepo.create({
        responseId,
        inspectionId,
        ...stored,
        uploadedBy: userId,
      }),
    );
    await this.auditService.log({
      entityType: 'requirement_attachment',
      entityId: responseId,
      action: 'attachment_uploaded',
      actorId: userId,
      source,
      description: `Uploaded ${file.originalname} to ${inspection.inspectionCode}`,
      newValue: {
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        inspectionId,
      },
    });
    return this.findOne(inspectionId, baseUrl);
  }

  async deleteAttachment(
    inspectionId: string,
    attachmentId: string,
    userId: string,
    baseUrl: string,
    source: AuditSource = 'portal',
  ) {
    const inspection = await this.loadInspection(inspectionId);
    this.assertEditable(inspection);
    this.assertOwner(inspection, userId);

    const attachment = await this.attachmentRepo.findOne({
      where: { id: attachmentId, inspectionId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    await this.attachmentRepo.remove(attachment);
    await this.auditService.log({
      entityType: 'requirement_attachment',
      entityId: attachmentId,
      action: 'attachment_deleted',
      actorId: userId,
      source,
      description: `Deleted attachment from ${inspection.inspectionCode}`,
      oldValue: { fileName: attachment.fileName, inspectionId },
    });
    return this.findOne(inspectionId, baseUrl);
  }

  async uploadSignature(
    inspectionId: string,
    file: Express.Multer.File,
    userId: string,
    baseUrl: string,
    source: AuditSource = 'portal',
  ) {
    const inspection = await this.loadInspection(inspectionId);
    this.assertEditable(inspection);
    this.assertOwner(inspection, userId);
    this.storageService.validateImage(file, 0.5);

    const stored = this.storageService.saveSignature(
      inspectionId,
      file.buffer,
      file.mimetype,
    );
    inspection.signatureFilePath = stored.filePath;
    await this.inspectionRepo.save(inspection);
    await this.auditService.log({
      entityType: 'inspection',
      entityId: inspectionId,
      action: 'signature_uploaded',
      actorId: userId,
      source,
      description: `Uploaded signature for ${inspection.inspectionCode}`,
    });
    return this.findOne(inspectionId, baseUrl);
  }

  async submit(
    inspectionId: string,
    dto: SubmitInspectionDto,
    userId: string,
    baseUrl: string,
    source: AuditSource = 'portal',
  ) {
    const inspection = await this.loadInspection(inspectionId);
    this.assertEditable(inspection);
    this.assertOwner(inspection, userId);

    const pending = inspection.requirements.filter(
      (r) => r.status === RequirementStatus.PENDING,
    );
    if (pending.length > 0) {
      throw new BadRequestException(
        `All requirements must be reviewed (OK or N/A). ${pending.length} still pending.`,
      );
    }

    if (dto.finalRemarks !== undefined) {
      inspection.finalRemarks = dto.finalRemarks;
    }
    inspection.submittedAt = new Date();
    inspection.status =
      inspection.status === InspectionStatus.CHANGES_REQUESTED
        ? InspectionStatus.RESUBMITTED
        : InspectionStatus.SUBMITTED;
    await this.inspectionRepo.save(inspection);

    await this.auditService.log({
      entityType: 'inspection',
      entityId: inspectionId,
      action: 'submitted',
      actorId: userId,
      source,
      description: `Submitted inspection ${inspection.inspectionCode}`,
      newValue: {
        status: inspection.status,
        finalRemarks: dto.finalRemarks,
      },
    });

    return this.findOne(inspectionId, baseUrl);
  }
}
