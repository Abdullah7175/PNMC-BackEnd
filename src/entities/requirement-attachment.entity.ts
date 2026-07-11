import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { InspectionRequirementResponse } from './inspection-requirement-response.entity';

@Entity('requirement_attachments')
export class RequirementAttachment extends BaseEntity {
  @Column({ name: 'response_id', type: 'uuid' })
  responseId: string;

  @ManyToOne(() => InspectionRequirementResponse, (r) => r.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'response_id' })
  response: InspectionRequirementResponse;

  @Column({ name: 'inspection_id', type: 'uuid' })
  inspectionId: string;

  @Column({ name: 'file_name', length: 255 })
  fileName: string;

  @Column({ name: 'file_path', length: 500 })
  filePath: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize: number;

  @Column({ name: 'mime_type', length: 100 })
  mimeType: string;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedBy: string;
}
