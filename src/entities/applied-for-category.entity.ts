import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

@Entity('applied_for_categories')
@Unique(['code'])
export class AppliedForCategory extends BaseEntity {
  @Column({ length: 150 })
  name: string;

  @Column({ length: 50 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
