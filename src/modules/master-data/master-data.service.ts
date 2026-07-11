import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Province } from '../../entities/province.entity';
import { District } from '../../entities/district.entity';
import { AppliedForCategory } from '../../entities/applied-for-category.entity';
import { InspectionType } from '../../common/enums/inspection.enum';
import {
  CreateProvinceDto,
  UpdateProvinceDto,
  CreateDistrictDto,
  UpdateDistrictDto,
  CreateAppliedForDto,
  UpdateAppliedForDto,
} from './dto/master-data.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class MasterDataService {
  constructor(
    @InjectRepository(Province) private provinceRepo: Repository<Province>,
    @InjectRepository(District) private districtRepo: Repository<District>,
    @InjectRepository(AppliedForCategory)
    private appliedForRepo: Repository<AppliedForCategory>,
    private auditService: AuditService,
  ) {}

  // ── Provinces ──────────────────────────────────────────────

  findProvinces(activeOnly = false) {
    return this.provinceRepo.find({
      where: activeOnly ? { isActive: true } : undefined,
      order: { sortOrder: 'ASC', name: 'ASC' },
      relations: { districts: true },
    });
  }

  async findProvince(id: string) {
    const province = await this.provinceRepo.findOne({
      where: { id },
      relations: { districts: true },
    });
    if (!province) throw new NotFoundException('Province not found');
    return province;
  }

  async createProvince(dto: CreateProvinceDto, actorId?: string) {
    const existing = await this.provinceRepo.findOne({
      where: { name: dto.name },
    });
    if (existing) throw new BadRequestException('Province already exists');
    const province = await this.provinceRepo.save(
      this.provinceRepo.create({
        name: dto.name,
        code: dto.code ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      }),
    );
    await this.auditService.log({
      entityType: 'province',
      entityId: province.id,
      action: 'created',
      actorId,
      source: 'portal',
      description: `Created province ${province.name}`,
    });
    return province;
  }

  async updateProvince(id: string, dto: UpdateProvinceDto, actorId?: string) {
    const province = await this.findProvince(id);
    Object.assign(province, {
      name: dto.name ?? province.name,
      code: dto.code !== undefined ? dto.code : province.code,
      sortOrder: dto.sortOrder ?? province.sortOrder,
      isActive: dto.isActive ?? province.isActive,
    });
    const saved = await this.provinceRepo.save(province);
    await this.auditService.log({
      entityType: 'province',
      entityId: id,
      action: 'updated',
      actorId,
      source: 'portal',
      description: `Updated province ${saved.name}`,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async deleteProvince(id: string, actorId?: string) {
    const province = await this.findProvince(id);
    await this.provinceRepo.remove(province);
    await this.auditService.log({
      entityType: 'province',
      entityId: id,
      action: 'deleted',
      actorId,
      source: 'portal',
      description: `Deleted province ${province.name}`,
    });
    return { deleted: true };
  }

  // ── Districts ──────────────────────────────────────────────

  findDistricts(provinceId?: string, activeOnly = false) {
    const where: Record<string, unknown> = {};
    if (provinceId) where.provinceId = provinceId;
    if (activeOnly) where.isActive = true;
    return this.districtRepo.find({
      where: Object.keys(where).length ? where : undefined,
      order: { sortOrder: 'ASC', name: 'ASC' },
      relations: { province: true },
    });
  }

  async findDistrict(id: string) {
    const district = await this.districtRepo.findOne({
      where: { id },
      relations: { province: true },
    });
    if (!district) throw new NotFoundException('District not found');
    return district;
  }

  async createDistrict(dto: CreateDistrictDto, actorId?: string) {
    await this.findProvince(dto.provinceId);
    const existing = await this.districtRepo.findOne({
      where: { provinceId: dto.provinceId, name: dto.name },
    });
    if (existing) {
      throw new BadRequestException(
        'District already exists in this province',
      );
    }
    const district = await this.districtRepo.save(
      this.districtRepo.create({
        provinceId: dto.provinceId,
        name: dto.name,
        code: dto.code ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      }),
    );
    await this.auditService.log({
      entityType: 'district',
      entityId: district.id,
      action: 'created',
      actorId,
      source: 'portal',
      description: `Created district ${district.name}`,
      newValue: { provinceId: dto.provinceId, name: dto.name },
    });
    return district;
  }

  async updateDistrict(id: string, dto: UpdateDistrictDto, actorId?: string) {
    const district = await this.findDistrict(id);
    if (dto.provinceId) await this.findProvince(dto.provinceId);
    Object.assign(district, {
      provinceId: dto.provinceId ?? district.provinceId,
      name: dto.name ?? district.name,
      code: dto.code !== undefined ? dto.code : district.code,
      sortOrder: dto.sortOrder ?? district.sortOrder,
      isActive: dto.isActive ?? district.isActive,
    });
    const saved = await this.districtRepo.save(district);
    await this.auditService.log({
      entityType: 'district',
      entityId: id,
      action: 'updated',
      actorId,
      source: 'portal',
      description: `Updated district ${saved.name}`,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async deleteDistrict(id: string, actorId?: string) {
    const district = await this.findDistrict(id);
    await this.districtRepo.remove(district);
    await this.auditService.log({
      entityType: 'district',
      entityId: id,
      action: 'deleted',
      actorId,
      source: 'portal',
      description: `Deleted district ${district.name}`,
    });
    return { deleted: true };
  }

  // ── Applied for ────────────────────────────────────────────

  findAppliedFor(activeOnly = false) {
    return this.appliedForRepo.find({
      where: activeOnly ? { isActive: true } : undefined,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findAppliedForOne(id: string) {
    const item = await this.appliedForRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Applied-for category not found');
    return item;
  }

  async createAppliedFor(dto: CreateAppliedForDto, actorId?: string) {
    const existing = await this.appliedForRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) throw new BadRequestException('Code already exists');
    const item = await this.appliedForRepo.save(
      this.appliedForRepo.create({
        name: dto.name,
        code: dto.code,
        description: dto.description ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      }),
    );
    await this.auditService.log({
      entityType: 'applied_for',
      entityId: item.id,
      action: 'created',
      actorId,
      source: 'portal',
      description: `Created applied-for category ${item.name}`,
    });
    return item;
  }

  async updateAppliedFor(id: string, dto: UpdateAppliedForDto, actorId?: string) {
    const item = await this.findAppliedForOne(id);
    Object.assign(item, {
      name: dto.name ?? item.name,
      code: dto.code ?? item.code,
      description:
        dto.description !== undefined ? dto.description : item.description,
      sortOrder: dto.sortOrder ?? item.sortOrder,
      isActive: dto.isActive ?? item.isActive,
    });
    const saved = await this.appliedForRepo.save(item);
    await this.auditService.log({
      entityType: 'applied_for',
      entityId: id,
      action: 'updated',
      actorId,
      source: 'portal',
      description: `Updated applied-for category ${saved.name}`,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async deleteAppliedFor(id: string, actorId?: string) {
    const item = await this.findAppliedForOne(id);
    await this.appliedForRepo.remove(item);
    await this.auditService.log({
      entityType: 'applied_for',
      entityId: id,
      action: 'deleted',
      actorId,
      source: 'portal',
      description: `Deleted applied-for category ${item.name}`,
    });
    return { deleted: true };
  }

  // ── Mobile lookups ─────────────────────────────────────────

  getInspectionTypes() {
    return [
      { value: InspectionType.NEW_INSPECTION, label: 'New' },
      { value: InspectionType.ENHANCEMENT, label: 'Enhancement' },
      { value: InspectionType.REINSPECTION, label: 'Re-inspection' },
      { value: InspectionType.EVENING_SHIFT, label: 'Evening Shift' },
    ];
  }

  async getMobileLookups() {
    const [provinces, appliedFor] = await Promise.all([
      this.provinceRepo.find({
        where: { isActive: true },
        order: { sortOrder: 'ASC', name: 'ASC' },
        relations: { districts: true },
      }),
      this.appliedForRepo.find({
        where: { isActive: true },
        order: { sortOrder: 'ASC', name: 'ASC' },
      }),
    ]);

    return {
      provinces: provinces.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        districts: (p.districts ?? [])
          .filter((d) => d.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
          .map((d) => ({
            id: d.id,
            name: d.name,
            code: d.code,
            provinceId: d.provinceId,
          })),
      })),
      appliedFor: appliedFor.map((a) => ({
        id: a.id,
        name: a.name,
        code: a.code,
        description: a.description,
      })),
      inspectionTypes: this.getInspectionTypes(),
    };
  }
}
