import { Column, Entity, JoinTable, ManyToMany, Unique } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Role } from './role.entity';

@Entity('users')
@Unique(['email'])
export class User extends BaseEntity {
  @Column({ length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({ name: 'employee_id', type: 'varchar', length: 50, nullable: true })
  employeeId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /** Field inspector who uses the Flutter mobile app */
  @Column({ name: 'is_mobile_user', default: false })
  isMobileUser: boolean;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];
}
