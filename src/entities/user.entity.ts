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

  /** Work / employee identity number */
  @Column({ name: 'employee_id', type: 'varchar', length: 50, nullable: true })
  employeeId: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  /** National Identity Card (CNIC / NIC) */
  @Column({ type: 'varchar', length: 20, nullable: true })
  nic: string | null;

  /** Job title / designation / position */
  @Column({ type: 'varchar', length: 150, nullable: true })
  designation: string | null;

  /** Residential / postal address */
  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null;

  /** Office name, location, or other office details */
  @Column({ name: 'office_details', type: 'varchar', length: 500, nullable: true })
  officeDetails: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /** Field inspector who uses the Flutter mobile app */
  @Column({ name: 'is_mobile_user', default: false })
  isMobileUser: boolean;

  /** Hashed refresh token for rotation / revocation (OWASP) */
  @Column({ name: 'refresh_token_hash', type: 'varchar', length: 255, nullable: true })
  refreshTokenHash: string | null;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];
}
