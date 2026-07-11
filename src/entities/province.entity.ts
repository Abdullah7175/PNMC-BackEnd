import { Column, Entity, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { District } from './district.entity';

@Entity('provinces')
@Unique(['name'])
export class Province extends BaseEntity {
  @Column({ length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  code: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => District, (d) => d.province)
  districts: District[];
}
