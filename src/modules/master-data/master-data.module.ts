import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Province } from '../../entities/province.entity';
import { District } from '../../entities/district.entity';
import { AppliedForCategory } from '../../entities/applied-for-category.entity';
import { MasterDataService } from './master-data.service';
import {
  ProvincesController,
  DistrictsController,
  AppliedForController,
} from './master-data.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Province, District, AppliedForCategory]),
    AuditModule,
  ],
  controllers: [
    ProvincesController,
    DistrictsController,
    AppliedForController,
  ],
  providers: [MasterDataService],
  exports: [MasterDataService],
})
export class MasterDataModule {}
