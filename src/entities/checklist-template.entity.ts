import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { ChecklistRequirement } from './checklist-requirement.entity';

@Entity('checklist_templates')
export class ChecklistTemplate extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @OneToMany(() => ChecklistRequirement, (req) => req.template, {
    cascade: true,
  })
  requirements: ChecklistRequirement[];
}
