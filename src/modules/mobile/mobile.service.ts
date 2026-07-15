import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Province } from '../../entities/province.entity';
import { District } from '../../entities/district.entity';
import { MasterDataService } from '../master-data/master-data.service';
import { CreateInspectionDto, UpdateInspectionDto } from '../inspections/dto/inspection.dto';

@Injectable()
export class MobileService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Province) private provinceRepo: Repository<Province>,
    @InjectRepository(District) private districtRepo: Repository<District>,
    private masterDataService: MasterDataService,
  ) {}

  async getUserOrThrow(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId, isActive: true },
      relations: { roles: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Org assignment for the logged-in mobile inspector:
   * province supervisor(s) + own district scope.
   */
  async getAssignment(userId: string) {
    const user = await this.getUserOrThrow(userId);

    let province: Province | null = null;
    let district: District | null = null;

    if (user.provinceId) {
      province = await this.provinceRepo.findOne({
        where: { id: user.provinceId },
      });
    }
    if (user.districtId) {
      district = await this.districtRepo.findOne({
        where: { id: user.districtId },
      });
    }

    const supervisors =
      user.provinceId
        ? await this.userRepo
            .createQueryBuilder('u')
            .innerJoin('u.roles', 'r')
            .where('u.isActive = true')
            .andWhere('u.isMobileUser = false')
            .andWhere('u.provinceId = :provinceId', {
              provinceId: user.provinceId,
            })
            .andWhere('r.code = :role', { role: 'supervisor' })
            .orderBy('u.fullName', 'ASC')
            .getMany()
        : [];

    const scope = user.districtId
      ? 'district'
      : user.provinceId
        ? 'province'
        : 'unassigned';

    return {
      scope,
      province: province
        ? { id: province.id, name: province.name, code: province.code }
        : user.province
          ? { id: null, name: user.province, code: null }
          : null,
      district: district
        ? {
            id: district.id,
            name: district.name,
            code: district.code,
            provinceId: district.provinceId,
          }
        : user.district
          ? {
              id: null,
              name: user.district,
              code: null,
              provinceId: user.provinceId,
            }
          : null,
      provinceId: user.provinceId,
      districtId: user.districtId,
      supervisors: supervisors.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        email: s.email,
        phone: s.phone,
        designation: s.designation,
        employeeId: s.employeeId,
      })),
      message:
        scope === 'unassigned'
          ? 'No province/district assigned. Ask an admin to assign your district.'
          : scope === 'district'
            ? 'You work under your assigned district; inspections must use this district.'
            : 'You are assigned to a province; pick a district within that province.',
    };
  }

  async getScopedLookups(userId: string) {
    const user = await this.getUserOrThrow(userId);
    const all = await this.masterDataService.getMobileLookups();

    if (!user.provinceId) {
      return {
        ...all,
        assignmentScope: 'unassigned' as const,
        note: 'Account has no province assignment — showing all locations.',
      };
    }

    const provinces = all.provinces
      .filter((p) => p.id === user.provinceId)
      .map((p) => ({
        ...p,
        districts: user.districtId
          ? p.districts.filter((d) => d.id === user.districtId)
          : p.districts,
      }));

    return {
      ...all,
      provinces,
      assignmentScope: user.districtId
        ? ('district' as const)
        : ('province' as const),
      note: user.districtId
        ? 'Lookups limited to your assigned province and district.'
        : 'Lookups limited to your assigned province.',
    };
  }

  async getScopedProvinces(userId: string) {
    const lookups = await this.getScopedLookups(userId);
    return lookups.provinces.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
    }));
  }

  async getScopedDistricts(userId: string, provinceId: string) {
    const user = await this.getUserOrThrow(userId);
    if (user.provinceId && user.provinceId !== provinceId) {
      throw new ForbiddenException(
        'You can only access districts in your assigned province',
      );
    }
    const list = await this.masterDataService.findDistricts(provinceId, true);
    const filtered = user.districtId
      ? list.filter((d) => d.id === user.districtId)
      : list;
    return filtered.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      provinceId: d.provinceId,
    }));
  }

  /**
   * Force create/update payloads to the inspector's assigned province/district.
   */
  async applyLocationScopeToCreate(
    userId: string,
    dto: CreateInspectionDto,
  ): Promise<CreateInspectionDto> {
    const user = await this.getUserOrThrow(userId);
    if (!user.provinceId && !user.districtId) {
      throw new BadRequestException(
        'Your account has no province/district assignment. Contact an administrator.',
      );
    }

    if (user.districtId) {
      if (
        dto.districtId &&
        dto.districtId !== user.districtId
      ) {
        throw new ForbiddenException(
          'Inspections must be created in your assigned district',
        );
      }
      if (dto.provinceId && user.provinceId && dto.provinceId !== user.provinceId) {
        throw new ForbiddenException(
          'Inspections must be created in your assigned province',
        );
      }
      return {
        ...dto,
        provinceId: user.provinceId ?? dto.provinceId,
        districtId: user.districtId,
        province: undefined,
        district: undefined,
      };
    }

    // Province-only: must pick a district in that province
    const districtId = dto.districtId;
    if (!districtId) {
      throw new BadRequestException(
        'districtId is required and must belong to your assigned province',
      );
    }
    const district = await this.districtRepo.findOne({
      where: { id: districtId },
    });
    if (!district) throw new BadRequestException('Invalid districtId');
    if (user.provinceId && district.provinceId !== user.provinceId) {
      throw new ForbiddenException(
        'District is outside your assigned province',
      );
    }
    return {
      ...dto,
      provinceId: user.provinceId ?? district.provinceId,
      districtId: district.id,
      province: undefined,
      district: undefined,
    };
  }

  async applyLocationScopeToUpdate(
    userId: string,
    dto: UpdateInspectionDto,
  ): Promise<UpdateInspectionDto> {
    const user = await this.getUserOrThrow(userId);
    if (!user.provinceId && !user.districtId) return dto;

    if (
      dto.provinceId === undefined &&
      dto.districtId === undefined &&
      dto.province === undefined &&
      dto.district === undefined
    ) {
      return dto;
    }

    if (user.districtId) {
      if (dto.districtId && dto.districtId !== user.districtId) {
        throw new ForbiddenException(
          'You cannot move an inspection outside your assigned district',
        );
      }
      if (
        dto.provinceId &&
        user.provinceId &&
        dto.provinceId !== user.provinceId
      ) {
        throw new ForbiddenException(
          'You cannot move an inspection outside your assigned province',
        );
      }
      return {
        ...dto,
        provinceId: user.provinceId ?? dto.provinceId,
        districtId: user.districtId,
        province: undefined,
        district: undefined,
      };
    }

    if (dto.districtId) {
      const district = await this.districtRepo.findOne({
        where: { id: dto.districtId },
      });
      if (!district) throw new BadRequestException('Invalid districtId');
      if (user.provinceId && district.provinceId !== user.provinceId) {
        throw new ForbiddenException(
          'District is outside your assigned province',
        );
      }
      return {
        ...dto,
        provinceId: user.provinceId ?? district.provinceId,
        districtId: district.id,
        province: undefined,
        district: undefined,
      };
    }

    return {
      ...dto,
      provinceId: user.provinceId ?? dto.provinceId,
      province: undefined,
    };
  }
}
