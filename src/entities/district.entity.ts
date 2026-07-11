import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Province } from './province.entity';

@Entity('districts')
@Unique(['provinceId', 'name'])
export class District extends BaseEntity {
  @Column({ name: 'province_id', type: 'uuid' })
  provinceId: string;

  @ManyToOne(() => Province, (p) => p.districts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'province_id' })
  province: Province;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  code: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
