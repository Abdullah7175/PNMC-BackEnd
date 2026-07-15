import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Role } from './role.entity';
import { Province } from './province.entity';
import { District } from './district.entity';

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

  /** Display name (kept in sync with province relation) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string | null;

  /** Display name (kept in sync with district relation) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string | null;

  /**
   * Supervisors are scoped to a province.
   * Mobile inspectors belong to a province (and usually a district).
   */
  @Column({ name: 'province_id', type: 'uuid', nullable: true })
  provinceId: string | null;

  @ManyToOne(() => Province, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'province_id' })
  assignedProvince: Province | null;

  /**
   * Mobile inspectors work under a district within their province.
   * Supervisors typically leave this null (province-level only).
   */
  @Column({ name: 'district_id', type: 'uuid', nullable: true })
  districtId: string | null;

  @ManyToOne(() => District, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'district_id' })
  assignedDistrict: District | null;

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
