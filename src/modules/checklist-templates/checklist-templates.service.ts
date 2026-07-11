import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChecklistTemplate } from '../../entities/checklist-template.entity';

@Injectable()
export class ChecklistTemplatesService {
  constructor(
    @InjectRepository(ChecklistTemplate)
    private templateRepo: Repository<ChecklistTemplate>,
  ) {}

  async getActive() {
    const template = await this.templateRepo.findOne({
      where: { isActive: true },
      relations: { requirements: true },
      order: { requirements: { sortOrder: 'ASC' } },
    });
    if (!template) return null;
    return {
      id: template.id,
      name: template.name,
      version: template.version,
      requirements: (template.requirements ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((r) => ({
          id: r.id,
          number: r.number,
          flag: r.flag,
          category: r.category,
          title: r.title,
          provision: r.provision,
          regulationRef: r.regulationRef,
          sortOrder: r.sortOrder,
          hasFeeDetails: r.hasFeeDetails,
        })),
    };
  }

  findAll() {
    return this.templateRepo.find({
      relations: { requirements: true },
      order: { version: 'DESC' },
    });
  }
}
