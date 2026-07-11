import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Inspection } from '../../entities/inspection.entity';
import { ChecklistTemplate } from '../../entities/checklist-template.entity';
import { InspectionRequirementResponse } from '../../entities/inspection-requirement-response.entity';
import { RequirementComment } from '../../entities/requirement-comment.entity';
import { RequirementAttachment } from '../../entities/requirement-attachment.entity';
import { InspectionFeeDetail } from '../../entities/inspection-fee-detail.entity';
import { InspectionsService } from './inspections.service';
import { InspectionsController } from './inspections.controller';
import { AuditModule } from '../audit/audit.module';
import { MasterDataModule } from '../master-data/master-data.module';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
    TypeOrmModule.forFeature([
      Inspection,
      ChecklistTemplate,
      InspectionRequirementResponse,
      RequirementComment,
      RequirementAttachment,
      InspectionFeeDetail,
    ]),
    AuditModule,
    MasterDataModule,
  ],
  controllers: [InspectionsController],
  providers: [InspectionsService],
  exports: [InspectionsService],
})
export class InspectionsModule {}
