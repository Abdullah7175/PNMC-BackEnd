import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inspection } from '../../entities/inspection.entity';
import { InspectionStatus } from '../../common/enums/inspection.enum';
import { SupervisorReviewDto } from '../inspections/dto/inspection.dto';
import { InspectionsService } from '../inspections/inspections.service';
import { AuditService } from '../audit/audit.service';

export type SupervisorScope = {
  isAdmin?: boolean;
  provinceId?: string | null;
  province?: string | null;
};

@Injectable()
export class SupervisorService {
  constructor(
    @InjectRepository(Inspection)
    private inspectionRepo: Repository<Inspection>,
    private inspectionsService: InspectionsService,
    private auditService: AuditService,
  ) {}

  private applyProvinceScope(
    qb: ReturnType<Repository<Inspection>['createQueryBuilder']>,
    scope?: SupervisorScope,
  ) {
    if (scope?.isAdmin) return;
    if (scope?.provinceId) {
      qb.andWhere(
        '(i.provinceId = :scopeProvinceId OR (i.provinceId IS NULL AND i.province = :scopeProvinceName))',
        {
          scopeProvinceId: scope.provinceId,
          scopeProvinceName: scope.province ?? null,
        },
      );
      return;
    }
    if (scope?.province) {
      qb.andWhere('i.province = :scopeProvinceName', {
        scopeProvinceName: scope.province,
      });
    }
  }

  private assertInScope(inspection: Inspection, scope?: SupervisorScope) {
    if (!scope || scope.isAdmin) return;
    if (scope.provinceId) {
      const ok =
        inspection.provinceId === scope.provinceId ||
        (!inspection.provinceId &&
          !!scope.province &&
          inspection.province === scope.province);
      if (!ok) {
        throw new ForbiddenException(
          'This inspection is outside your assigned province',
        );
      }
      return;
    }
    if (scope.province && inspection.province !== scope.province) {
      throw new ForbiddenException(
        'This inspection is outside your assigned province',
      );
    }
  }

  async findQueue(
    filters: {
      status?: string;
      province?: string;
      district?: string;
    },
    baseUrl: string,
    scope?: SupervisorScope,
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

    this.applyProvinceScope(qb, scope);

    if (filters.province && scope?.isAdmin) {
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

  async getStats(scope?: SupervisorScope) {
    const qb = this.inspectionRepo.createQueryBuilder('i');
    this.applyProvinceScope(qb, scope);

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
      scopedProvinceId: scope?.provinceId ?? null,
      scopedProvince: scope?.province ?? null,
    };
  }

  async findOne(id: string, baseUrl: string, scope?: SupervisorScope) {
    const inspection = await this.inspectionRepo.findOne({ where: { id } });
    if (!inspection) throw new NotFoundException('Inspection not found');
    this.assertInScope(inspection, scope);
    return this.inspectionsService.findOne(id, baseUrl);
  }

  async review(
    id: string,
    dto: SupervisorReviewDto,
    reviewerId: string,
    baseUrl: string,
    scope?: SupervisorScope,
  ) {
    const inspection = await this.inspectionRepo.findOne({ where: { id } });
    if (!inspection) throw new NotFoundException('Inspection not found');
    this.assertInScope(inspection, scope);

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

    return this.findOne(id, baseUrl, scope);
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
