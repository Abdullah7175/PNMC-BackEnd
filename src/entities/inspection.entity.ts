import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import {
  InspectionStatus,
  InspectionType,
} from '../common/enums/inspection.enum';
import { InspectionRequirementResponse } from './inspection-requirement-response.entity';
import { InspectionFeeDetail } from './inspection-fee-detail.entity';
import { User } from './user.entity';

@Entity('inspections')
export class Inspection extends BaseEntity {
  @Column({ name: 'inspection_code', length: 50, unique: true })
  inspectionCode: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @Column({ name: 'template_version', type: 'int' })
  templateVersion: number;

  @Column({ name: 'inspector_id', type: 'uuid', nullable: true })
  inspectorId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'inspector_id' })
  inspector: User | null;

  @Column({ name: 'supervisor_id', type: 'uuid', nullable: true })
  supervisorId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'supervisor_id' })
  supervisor: User | null;

  @Column({ name: 'institute_name', length: 500 })
  instituteName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string | null;

  @Column({ name: 'province_id', type: 'uuid', nullable: true })
  provinceId: string | null;

  @Column({ name: 'district_id', type: 'uuid', nullable: true })
  districtId: string | null;

  @Column({ name: 'applied_for', type: 'varchar', length: 100, nullable: true })
  appliedFor: string | null;

  @Column({ name: 'applied_for_id', type: 'uuid', nullable: true })
  appliedForId: string | null;

  @Column({
    name: 'inspection_type',
    type: 'enum',
    enum: InspectionType,
    default: InspectionType.NEW_INSPECTION,
  })
  inspectionType: InspectionType;

  @Column({ name: 'inspection_date', type: 'date', nullable: true })
  inspectionDate: string | null;

  @Column({ name: 'assigned_date', type: 'date', nullable: true })
  assignedDate: string | null;

  @Column({ name: 'principal_name', type: 'varchar', length: 255, nullable: true })
  principalName: string | null;

  @Column({ name: 'principal_reg_no', type: 'varchar', length: 100, nullable: true })
  principalRegNo: string | null;

  @Column({ name: 'principal_qualification', type: 'varchar', length: 255, nullable: true })
  principalQualification: string | null;

  @Column({ name: 'final_remarks', type: 'text', nullable: true })
  finalRemarks: string | null;

  @Column({ name: 'signature_file_path', type: 'varchar', length: 500, nullable: true })
  signatureFilePath: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({
    type: 'enum',
    enum: InspectionStatus,
    default: InspectionStatus.DRAFT,
  })
  status: InspectionStatus;

  @Column({ name: 'supervisor_remarks', type: 'text', nullable: true })
  supervisorRemarks: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'synced_at', type: 'timestamptz', nullable: true })
  syncedAt: Date | null;

  @OneToMany(() => InspectionRequirementResponse, (r) => r.inspection, {
    cascade: true,
  })
  requirements: InspectionRequirementResponse[];

  @OneToOne(() => InspectionFeeDetail, (f) => f.inspection, { cascade: true })
  feeDetail: InspectionFeeDetail | null;
}
