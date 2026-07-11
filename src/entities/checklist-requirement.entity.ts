import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { ChecklistTemplate } from './checklist-template.entity';

@Entity('checklist_requirements')
export class ChecklistRequirement extends BaseEntity {
  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @ManyToOne(() => ChecklistTemplate, (template) => template.requirements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: ChecklistTemplate;

  @Column({ type: 'int' })
  number: number;

  @Column({ length: 50 })
  flag: string;

  @Column({ length: 255 })
  category: string;

  @Column({ length: 500 })
  title: string;

  @Column({ type: 'text' })
  provision: string;

  @Column({ name: 'regulation_ref', type: 'varchar', length: 255, nullable: true })
  regulationRef: string | null;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;

  /** When true, mobile/portal should collect fee payment breakdown for this item */
  @Column({ name: 'has_fee_details', default: false })
  hasFeeDetails: boolean;
}
