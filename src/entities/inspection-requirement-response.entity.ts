import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { RequirementStatus } from '../common/enums/requirement.enum';
import { ChecklistRequirement } from './checklist-requirement.entity';
import { Inspection } from './inspection.entity';
import { RequirementAttachment } from './requirement-attachment.entity';
import { RequirementComment } from './requirement-comment.entity';

@Entity('inspection_requirement_responses')
export class InspectionRequirementResponse extends BaseEntity {
  @Column({ name: 'inspection_id', type: 'uuid' })
  inspectionId: string;

  @ManyToOne(() => Inspection, (inspection) => inspection.requirements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'inspection_id' })
  inspection: Inspection;

  @Column({ name: 'requirement_id', type: 'uuid' })
  requirementId: string;

  @ManyToOne(() => ChecklistRequirement)
  @JoinColumn({ name: 'requirement_id' })
  requirement: ChecklistRequirement;

  @Column({ name: 'requirement_number', type: 'int' })
  requirementNumber: number;

  @Column({
    type: 'enum',
    enum: RequirementStatus,
    default: RequirementStatus.PENDING,
  })
  status: RequirementStatus;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @OneToMany(() => RequirementComment, (c) => c.response, { cascade: true })
  comments: RequirementComment[];

  @OneToMany(() => RequirementAttachment, (a) => a.response, { cascade: true })
  attachments: RequirementAttachment[];
}
