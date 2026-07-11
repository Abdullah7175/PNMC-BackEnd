import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { InspectionsModule } from './modules/inspections/inspections.module';
import { SupervisorModule } from './modules/supervisor/supervisor.module';
import { ChecklistTemplatesModule } from './modules/checklist-templates/checklist-templates.module';
import { StorageModule } from './modules/storage/storage.module';
import { JwtAuthGuard, PermissionsGuard } from './common/guards/auth.guard';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { ChecklistTemplate } from './entities/checklist-template.entity';
import { ChecklistRequirement } from './entities/checklist-requirement.entity';
import { Inspection } from './entities/inspection.entity';
import { InspectionRequirementResponse } from './entities/inspection-requirement-response.entity';
import { RequirementComment } from './entities/requirement-comment.entity';
import { RequirementAttachment } from './entities/requirement-attachment.entity';
import { InspectionFeeDetail } from './entities/inspection-fee-detail.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Province } from './entities/province.entity';
import { District } from './entities/district.entity';
import { AppliedForCategory } from './entities/applied-for-category.entity';
import { MobileModule } from './modules/mobile/mobile.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [
          User,
          Role,
          Permission,
          ChecklistTemplate,
          ChecklistRequirement,
          Inspection,
          InspectionRequirementResponse,
          RequirementComment,
          RequirementAttachment,
          InspectionFeeDetail,
          AuditLog,
          Province,
          District,
          AppliedForCategory,
        ],
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    StorageModule,
    AuditModule,
    AuthModule,
    AdminModule,
    InspectionsModule,
    SupervisorModule,
    ChecklistTemplatesModule,
    MasterDataModule,
    MobileModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
