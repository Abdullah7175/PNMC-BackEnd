import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Inspection } from './inspection.entity';

export interface FeeLineItem {
  code: string;
  label: string;
  amount: number | null;
  remainingFee: number | null;
  selected?: boolean;
}

@Entity('inspection_fee_details')
export class InspectionFeeDetail extends BaseEntity {
  @Column({ name: 'inspection_id', type: 'uuid', unique: true })
  inspectionId: string;

  @OneToOne(() => Inspection, (i) => i.feeDetail, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inspection_id' })
  inspection: Inspection;

  @Column({ name: 'line_items', type: 'jsonb', default: [] })
  lineItems: FeeLineItem[];

  @Column({
    name: 'total_payable',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  totalPayable: string | null;

  @Column({
    name: 'paid_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  paidAmount: string | null;

  @Column({ name: 'challan_reference', type: 'varchar', length: 255, nullable: true })
  challanReference: string | null;

  @Column({ name: 'bank_account', type: 'varchar', length: 255, nullable: true })
  bankAccount: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
