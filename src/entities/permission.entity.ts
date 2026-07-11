import { Column, Entity, ManyToMany, Unique } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Role } from './role.entity';

@Entity('permissions')
@Unique(['code'])
export class Permission extends BaseEntity {
  @Column({ length: 100 })
  code: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 100 })
  page: string;

  @Column({ length: 50 })
  action: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
