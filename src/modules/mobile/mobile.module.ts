import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { InspectionsModule } from '../inspections/inspections.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { AuditModule } from '../audit/audit.module';
import { MobileController } from './mobile.controller';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
    InspectionsModule,
    MasterDataModule,
    AuditModule,
  ],
  controllers: [MobileController],
})
export class MobileModule {}
