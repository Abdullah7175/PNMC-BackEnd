import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inspection } from '../../entities/inspection.entity';
import { SupervisorService } from './supervisor.service';
import {
  SupervisorController,
  AdminInspectionsController,
} from './supervisor.controller';
import { InspectionsModule } from '../inspections/inspections.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inspection]),
    InspectionsModule,
    AuditModule,
  ],
  controllers: [SupervisorController, AdminInspectionsController],
  providers: [SupervisorService],
})
export class SupervisorModule {}
