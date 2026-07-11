import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import dataSource from '../data-source';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { ChecklistTemplate } from '../entities/checklist-template.entity';
import { ChecklistRequirement } from '../entities/checklist-requirement.entity';
import { OFFICIAL_CHECKLIST_ITEMS } from '../common/constants/official-checklist';
import { Province } from '../entities/province.entity';
import { District } from '../entities/district.entity';
import { AppliedForCategory } from '../entities/applied-for-category.entity';

dotenv.config();

const LOCATION_DATA: { name: string; code: string; districts: string[] }[] = [
  {
    name: 'Punjab',
    code: 'PB',
    districts: [
      'Lahore', 'Rawalpindi', 'Faisalabad', 'Multan', 'Gujranwala',
      'Sialkot', 'Bahawalpur', 'Sargodha', 'Sahiwal', 'Gujrat',
    ],
  },
  {
    name: 'Sindh',
    code: 'SD',
    districts: [
      'Karachi Central', 'Karachi East', 'Karachi West', 'Karachi South',
      'Karachi Malir', 'Karachi Korangi', 'Hyderabad', 'Sukkur',
      'Larkana', 'Mirpurkhas', 'Nawabshah',
    ],
  },
  {
    name: 'Khyber Pakhtunkhwa',
    code: 'KP',
    districts: [
      'Peshawar', 'Mardan', 'Abbottabad', 'Swat', 'Kohat',
      'Dera Ismail Khan', 'Charsadda', 'Nowshera',
    ],
  },
  {
    name: 'Balochistan',
    code: 'BL',
    districts: [
      'Quetta', 'Gwadar', 'Turbat', 'Khuzdar', 'Sibi', 'Zhob',
    ],
  },
  {
    name: 'Islamabad Capital Territory',
    code: 'ICT',
    districts: ['Islamabad'],
  },
  {
    name: 'Azad Jammu & Kashmir',
    code: 'AJK',
    districts: ['Muzaffarabad', 'Mirpur', 'Kotli'],
  },
  {
    name: 'Gilgit-Baltistan',
    code: 'GB',
    districts: ['Gilgit', 'Skardu', 'Hunza'],
  },
];

const APPLIED_FOR_DATA = [
  { name: 'MSN', code: 'MSN', description: 'Master of Science in Nursing', sortOrder: 1 },
  { name: 'BSN', code: 'BSN', description: 'Bachelor of Science in Nursing', sortOrder: 2 },
  { name: 'PRN', code: 'PRN', description: 'Post RN', sortOrder: 3 },
  { name: 'LHV', code: 'LHV', description: 'Lady Health Visitor', sortOrder: 4 },
  { name: 'CMW', code: 'CMW', description: 'Community Midwife', sortOrder: 5 },
  { name: 'CNA', code: 'CNA', description: 'Certified Nursing Assistant', sortOrder: 6 },
  { name: 'Other Degree', code: 'OTHER_DEGREE', description: 'Other degree program', sortOrder: 7 },
  { name: 'Other Diploma', code: 'OTHER_DIPLOMA', description: 'Other diploma program', sortOrder: 8 },
];

const PERMISSIONS = [
  { code: 'dashboard.view', name: 'View Dashboard', page: 'dashboard', action: 'view' },
  { code: 'inspections.view', name: 'View Inspections', page: 'inspections', action: 'view' },
  { code: 'inspections.create', name: 'Create Inspections', page: 'inspections', action: 'create' },
  { code: 'inspections.update', name: 'Update Inspections', page: 'inspections', action: 'update' },
  { code: 'inspections.submit', name: 'Submit Inspections', page: 'inspections', action: 'submit' },
  { code: 'inspections.review', name: 'Review Inspections', page: 'inspections', action: 'review' },
  { code: 'inspections.assign', name: 'Assign Inspections', page: 'inspections', action: 'assign' },
  { code: 'mobile.inspections.view', name: 'Mobile View Inspections', page: 'mobile-inspections', action: 'view' },
  { code: 'mobile.inspections.create', name: 'Mobile Create Inspections', page: 'mobile-inspections', action: 'create' },
  { code: 'mobile.inspections.update', name: 'Mobile Update Inspections', page: 'mobile-inspections', action: 'update' },
  { code: 'mobile.inspections.submit', name: 'Mobile Submit Inspections', page: 'mobile-inspections', action: 'submit' },
  { code: 'users.view', name: 'View Users', page: 'users', action: 'view' },
  { code: 'users.create', name: 'Create Users', page: 'users', action: 'create' },
  { code: 'users.update', name: 'Update Users', page: 'users', action: 'update' },
  { code: 'users.delete', name: 'Delete Users', page: 'users', action: 'delete' },
  { code: 'roles.view', name: 'View Roles', page: 'roles', action: 'view' },
  { code: 'roles.create', name: 'Create Roles', page: 'roles', action: 'create' },
  { code: 'roles.update', name: 'Update Roles', page: 'roles', action: 'update' },
  { code: 'roles.delete', name: 'Delete Roles', page: 'roles', action: 'delete' },
  { code: 'permissions.view', name: 'View Permissions', page: 'permissions', action: 'view' },
  { code: 'permissions.create', name: 'Create Permissions', page: 'permissions', action: 'create' },
  { code: 'permissions.update', name: 'Update Permissions', page: 'permissions', action: 'update' },
  { code: 'permissions.delete', name: 'Delete Permissions', page: 'permissions', action: 'delete' },
  { code: 'checklist-templates.view', name: 'View Checklist Templates', page: 'checklist-templates', action: 'view' },
  { code: 'checklist-templates.manage', name: 'Manage Checklist Templates', page: 'checklist-templates', action: 'manage' },
  { code: 'locations.view', name: 'View Locations', page: 'locations', action: 'view' },
  { code: 'locations.create', name: 'Create Locations', page: 'locations', action: 'create' },
  { code: 'locations.update', name: 'Update Locations', page: 'locations', action: 'update' },
  { code: 'locations.delete', name: 'Delete Locations', page: 'locations', action: 'delete' },
  { code: 'applied-for.view', name: 'View Applied For', page: 'applied-for', action: 'view' },
  { code: 'applied-for.create', name: 'Create Applied For', page: 'applied-for', action: 'create' },
  { code: 'applied-for.update', name: 'Update Applied For', page: 'applied-for', action: 'update' },
  { code: 'applied-for.delete', name: 'Delete Applied For', page: 'applied-for', action: 'delete' },
  { code: 'audit-logs.view', name: 'View Audit Logs', page: 'audit-logs', action: 'view' },
];

async function seed() {
  await dataSource.initialize();
  const permRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);
  const userRepo = dataSource.getRepository(User);
  const templateRepo = dataSource.getRepository(ChecklistTemplate);
  const reqRepo = dataSource.getRepository(ChecklistRequirement);

  console.log('Seeding permissions...');
  const permissions: Permission[] = [];
  for (const p of PERMISSIONS) {
    let perm = await permRepo.findOne({ where: { code: p.code } });
    if (!perm) {
      perm = await permRepo.save(
        permRepo.create({ ...p, description: `${p.page} - ${p.action}` }),
      );
    }
    permissions.push(perm);
  }

  console.log('Seeding roles...');
  let adminRole = await roleRepo.findOne({
    where: { code: 'admin' },
    relations: { permissions: true },
  });
  if (!adminRole) {
    adminRole = await roleRepo.save(
      roleRepo.create({
        code: 'admin',
        name: 'Administrator',
        description: 'Full system access',
        isSystem: true,
        permissions,
      }),
    );
  } else {
    adminRole.permissions = permissions;
    await roleRepo.save(adminRole);
  }

  const supervisorPerms = permissions.filter((p) =>
    ['dashboard.view', 'inspections.view', 'inspections.review'].includes(p.code),
  );
  let supervisorRole = await roleRepo.findOne({
    where: { code: 'supervisor' },
    relations: { permissions: true },
  });
  if (!supervisorRole) {
    supervisorRole = await roleRepo.save(
      roleRepo.create({
        code: 'supervisor',
        name: 'Supervisor',
        description: 'Review submitted inspection reports',
        isSystem: true,
        permissions: supervisorPerms,
      }),
    );
  } else {
    supervisorRole.permissions = supervisorPerms;
    await roleRepo.save(supervisorRole);
  }

  const fieldPerms = permissions.filter((p) =>
    p.code.startsWith('mobile.inspections.'),
  );
  let fieldRole = await roleRepo.findOne({
    where: { code: 'field_inspector' },
    relations: { permissions: true },
  });
  if (!fieldRole) {
    fieldRole = await roleRepo.save(
      roleRepo.create({
        code: 'field_inspector',
        name: 'Field Inspector',
        description: 'Mobile app field inspector (isMobileUser)',
        isSystem: true,
        permissions: fieldPerms,
      }),
    );
  } else {
    fieldRole.permissions = fieldPerms;
    await roleRepo.save(fieldRole);
  }

  console.log('Seeding users...');
  const adminHash = await bcrypt.hash('Admin@123', 10);
  let adminUser = await userRepo.findOne({
    where: { email: 'admin@pnmc.gov.pk' },
    relations: { roles: true },
  });
  if (!adminUser) {
    await userRepo.save(
      userRepo.create({
        email: 'admin@pnmc.gov.pk',
        passwordHash: adminHash,
        fullName: 'System Administrator',
        employeeId: 'ADM-2026-0001',
        isMobileUser: false,
        roles: [adminRole],
      }),
    );
  } else {
    adminUser.passwordHash = adminHash;
    adminUser.isActive = true;
    adminUser.isMobileUser = false;
    adminUser.roles = [adminRole];
    await userRepo.save(adminUser);
  }

  const supervisorHash = await bcrypt.hash('Supervisor@123', 10);
  let supervisorUser = await userRepo.findOne({
    where: { email: 'supervisor@pnmc.gov.pk' },
    relations: { roles: true },
  });
  if (!supervisorUser) {
    await userRepo.save(
      userRepo.create({
        email: 'supervisor@pnmc.gov.pk',
        passwordHash: supervisorHash,
        fullName: 'Senior Inspector',
        employeeId: 'SUP-2026-0001',
        province: 'Sindh',
        district: 'Karachi Central',
        isMobileUser: false,
        roles: [supervisorRole],
      }),
    );
  } else {
    supervisorUser.passwordHash = supervisorHash;
    supervisorUser.isActive = true;
    supervisorUser.isMobileUser = false;
    supervisorUser.roles = [supervisorRole];
    await userRepo.save(supervisorUser);
  }

  const fieldHash = await bcrypt.hash('Field@123', 10);
  let fieldUser = await userRepo.findOne({
    where: { email: 'inspector@pnmc.gov.pk' },
    relations: { roles: true },
  });
  if (!fieldUser) {
    await userRepo.save(
      userRepo.create({
        email: 'inspector@pnmc.gov.pk',
        passwordHash: fieldHash,
        fullName: 'Field Inspector',
        employeeId: 'INS-2026-0001',
        phone: '03001234567',
        nic: '42101-1234567-1',
        designation: 'Field Inspector',
        address: 'Karachi Central, Sindh',
        officeDetails: 'PNMC Regional Office — Karachi',
        province: 'Sindh',
        district: 'Karachi Central',
        isMobileUser: true,
        roles: [fieldRole],
      }),
    );
  } else {
    fieldUser.passwordHash = fieldHash;
    fieldUser.isActive = true;
    fieldUser.isMobileUser = true;
    fieldUser.roles = [fieldRole];
    if (!fieldUser.phone) fieldUser.phone = '03001234567';
    if (!fieldUser.nic) fieldUser.nic = '42101-1234567-1';
    if (!fieldUser.designation) fieldUser.designation = 'Field Inspector';
    if (!fieldUser.address) fieldUser.address = 'Karachi Central, Sindh';
    if (!fieldUser.officeDetails)
      fieldUser.officeDetails = 'PNMC Regional Office — Karachi';
    await userRepo.save(fieldUser);
  }

  console.log('Seeding official checklist template...');
  // Deactivate old templates and create/refresh official one
  const existingActive = await templateRepo.find({ where: { isActive: true } });
  for (const t of existingActive) {
    t.isActive = false;
    await templateRepo.save(t);
  }

  let official = await templateRepo.findOne({
    where: { name: 'PNMC Recognition Checklist 2023' },
    relations: { requirements: true },
  });

  if (!official) {
    official = await templateRepo.save(
      templateRepo.create({
        name: 'PNMC Recognition Checklist 2023',
        version: 2,
        isActive: true,
      }),
    );
  } else {
    official.isActive = true;
    await templateRepo.save(official);
  }

  const existingReqs = await reqRepo.count({
    where: { templateId: official.id },
  });
  if (existingReqs === 0) {
    for (const item of OFFICIAL_CHECKLIST_ITEMS) {
      await reqRepo.save(
        reqRepo.create({
          templateId: official.id,
          number: item.number,
          flag: item.flag,
          category: item.category,
          title: item.title,
          provision: item.provision,
          regulationRef: item.regulationRef,
          sortOrder: item.number,
          hasFeeDetails: item.hasFeeDetails,
        }),
      );
    }
  }

  console.log('Seeding provinces & districts...');
  const provinceRepo = dataSource.getRepository(Province);
  const districtRepo = dataSource.getRepository(District);
  let provinceSort = 1;
  for (const loc of LOCATION_DATA) {
    let province = await provinceRepo.findOne({ where: { name: loc.name } });
    if (!province) {
      province = await provinceRepo.save(
        provinceRepo.create({
          name: loc.name,
          code: loc.code,
          sortOrder: provinceSort,
          isActive: true,
        }),
      );
    }
    provinceSort += 1;
    let districtSort = 1;
    for (const dName of loc.districts) {
      const existing = await districtRepo.findOne({
        where: { provinceId: province.id, name: dName },
      });
      if (!existing) {
        await districtRepo.save(
          districtRepo.create({
            provinceId: province.id,
            name: dName,
            sortOrder: districtSort,
            isActive: true,
          }),
        );
      }
      districtSort += 1;
    }
  }

  console.log('Seeding applied-for categories...');
  const appliedForRepo = dataSource.getRepository(AppliedForCategory);
  for (const item of APPLIED_FOR_DATA) {
    const existing = await appliedForRepo.findOne({ where: { code: item.code } });
    if (!existing) {
      await appliedForRepo.save(
        appliedForRepo.create({
          ...item,
          isActive: true,
        }),
      );
    }
  }

  console.log('Seed completed successfully!');
  console.log('Admin:      admin@pnmc.gov.pk / Admin@123');
  console.log('Supervisor: supervisor@pnmc.gov.pk / Supervisor@123');
  console.log('Field (mobile): inspector@pnmc.gov.pk / Field@123  [isMobileUser=true]');

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
