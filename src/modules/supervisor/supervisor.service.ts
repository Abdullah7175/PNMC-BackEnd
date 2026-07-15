import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Inspection } from '../../entities/inspection.entity';
import { InspectionStatus } from '../../common/enums/inspection.enum';
import { SupervisorReviewDto } from '../inspections/dto/inspection.dto';
import { InspectionsService } from '../inspections/inspections.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SupervisorService {
  constructor(
    @InjectRepository(Inspection)
    private inspectionRepo: Repository<Inspection>,
    private inspectionsService: InspectionsService,
    private auditService: AuditService,
  ) {}

  async findQueue(
    filters: {
      status?: string;
      province?: string;
      district?: string;
    },
    baseUrl: string,
    _userProvince?: string | null,
  ) {
    const qb = this.inspectionRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.requirements', 'requirements')
      .leftJoinAndSelect('requirements.requirement', 'requirement')
      .leftJoinAndSelect('requirements.comments', 'comments')
      .leftJoinAndSelect('requirements.attachments', 'attachments')
      .leftJoinAndSelect('i.inspector', 'inspector')
      .leftJoinAndSelect('i.feeDetail', 'feeDetail')
      .orderBy('i.submittedAt', 'DESC', 'NULLS LAST');

    const statuses = filters.status
      ? [filters.status]
      : [
          InspectionStatus.SUBMITTED,
          InspectionStatus.UNDER_REVIEW,
          InspectionStatus.RESUBMITTED,
          InspectionStatus.APPROVED,
          InspectionStatus.REJECTED,
          InspectionStatus.CHANGES_REQUESTED,
        ];

    qb.andWhere('i.status IN (:...statuses)', { statuses });

    // Only filter when the portal UI explicitly requests it — do not hide
    // other provinces based on the supervisor user's profile province.
    if (filters.province) {
      qb.andWhere('i.province = :province', { province: filters.province });
    }

    if (filters.district) {
      qb.andWhere('i.district = :district', { district: filters.district });
    }

    const list = await qb.getMany();
    return list.map((i) =>
      this.inspectionsService.mapInspection(i, baseUrl),
    );
  }

  async getStats(_userProvince?: string | null) {
    const qb = this.inspectionRepo.createQueryBuilder('i');

    const all = await qb.getMany();
    const byStatus: Record<string, number> = {};
    for (const i of all) {
      byStatus[i.status] = (byStatus[i.status] ?? 0) + 1;
    }

    return {
      total: all.length,
      submitted: byStatus[InspectionStatus.SUBMITTED] ?? 0,
      underReview: byStatus[InspectionStatus.UNDER_REVIEW] ?? 0,
      approved: byStatus[InspectionStatus.APPROVED] ?? 0,
      rejected: byStatus[InspectionStatus.REJECTED] ?? 0,
      changesRequested: byStatus[InspectionStatus.CHANGES_REQUESTED] ?? 0,
      resubmitted: byStatus[InspectionStatus.RESUBMITTED] ?? 0,
      byStatus,
    };
  }

  async findOne(id: string, baseUrl: string) {
    return this.inspectionsService.findOne(id, baseUrl);
  }

  async review(
    id: string,
    dto: SupervisorReviewDto,
    reviewerId: string,
    baseUrl: string,
  ) {
    const inspection = await this.inspectionRepo.findOne({ where: { id } });
    if (!inspection) throw new NotFoundException('Inspection not found');

    const reviewable = [
      InspectionStatus.SUBMITTED,
      InspectionStatus.UNDER_REVIEW,
      InspectionStatus.RESUBMITTED,
    ];
    if (!reviewable.includes(inspection.status)) {
      throw new BadRequestException('Inspection is not in reviewable status');
    }

    const statusMap = {
      approve: InspectionStatus.APPROVED,
      reject: InspectionStatus.REJECTED,
      request_changes: InspectionStatus.CHANGES_REQUESTED,
    } as const;

    const oldStatus = inspection.status;
    inspection.status = statusMap[dto.action];
    inspection.supervisorRemarks = dto.remarks ?? null;
    inspection.reviewedAt = new Date();
    inspection.reviewedBy = reviewerId;

    if (oldStatus === InspectionStatus.SUBMITTED) {
      inspection.status =
        dto.action === 'approve'
          ? InspectionStatus.APPROVED
          : dto.action === 'reject'
            ? InspectionStatus.REJECTED
            : InspectionStatus.CHANGES_REQUESTED;
    }

    await this.inspectionRepo.save(inspection);

    await this.auditService.log({
      entityType: 'inspection',
      entityId: id,
      action: `review_${dto.action}`,
      actorId: reviewerId,
      source: 'portal',
      description: `Supervisor ${dto.action} on inspection ${inspection.inspectionCode}`,
      oldValue: { status: oldStatus },
      newValue: { status: inspection.status, remarks: dto.remarks },
    });

    return this.findOne(id, baseUrl);
  }

  async assign(
    id: string,
    inspectorId: string,
    supervisorId?: string,
    actorId?: string,
    baseUrl?: string,
  ) {
    const inspection = await this.inspectionRepo.findOne({ where: { id } });
    if (!inspection) throw new NotFoundException('Inspection not found');

    const oldInspectorId = inspection.inspectorId;
    inspection.inspectorId = inspectorId;
    if (supervisorId) inspection.supervisorId = supervisorId;
    await this.inspectionRepo.save(inspection);

    await this.auditService.log({
      entityType: 'inspection',
      entityId: id,
      action: 'assign',
      actorId: actorId ?? null,
      source: 'portal',
      description: `Assigned inspection ${inspection.inspectionCode} to inspector ${inspectorId}`,
      oldValue: { inspectorId: oldInspectorId },
      newValue: { inspectorId, supervisorId: supervisorId ?? null },
    });

    if (baseUrl) return this.findOne(id, baseUrl);
    return inspection;
  }
}
