import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { InspectionRequirementResponse } from './inspection-requirement-response.entity';

@Entity('requirement_comments')
export class RequirementComment extends BaseEntity {
  @Column({ name: 'response_id', type: 'uuid' })
  responseId: string;

  @ManyToOne(() => InspectionRequirementResponse, (r) => r.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'response_id' })
  response: InspectionRequirementResponse;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @Column({ name: 'author_name', length: 255 })
  authorName: string;

  @Column({ type: 'text' })
  text: string;
}
