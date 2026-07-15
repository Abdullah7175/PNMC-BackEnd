import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionsModule } from '../inspections/inspections.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { AuditModule } from '../audit/audit.module';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import { User } from '../../entities/user.entity';
import { Province } from '../../entities/province.entity';
import { District } from '../../entities/district.entity';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
    TypeOrmModule.forFeature([User, Province, District]),
    InspectionsModule,
    MasterDataModule,
    AuditModule,
  ],
  controllers: [MobileController],
  providers: [MobileService],
})
export class MobileModule {}
