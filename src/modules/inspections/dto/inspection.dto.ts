import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InspectionType } from '../../../common/enums/inspection.enum';
import { RequirementStatus } from '../../../common/enums/requirement.enum';

export class CreateInspectionDto {
  @ApiProperty({ example: 'Abc Nursing Institute' })
  @IsString()
  instituteName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'Preferred: province UUID from lookups' })
  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @ApiPropertyOptional({ description: 'Preferred: district UUID from lookups' })
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiPropertyOptional({ example: 'BSN' })
  @IsOptional()
  @IsString()
  appliedFor?: string;

  @ApiPropertyOptional({ description: 'Preferred: applied-for UUID from lookups' })
  @IsOptional()
  @IsUUID()
  appliedForId?: string;

  @ApiProperty({
    enum: InspectionType,
    description: 'Form status: New / Enhancement / Re-inspection / Evening Shift',
  })
  @IsEnum(InspectionType)
  type: InspectionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  principalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  principalRegNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  principalQualification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  inspectionDate?: string;

  @ApiPropertyOptional({ description: 'Client-generated UUID for offline sync' })
  @IsOptional()
  @IsUUID()
  clientId?: string;
}

export class UpdateInspectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instituteName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appliedFor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  appliedForId?: string;

  @ApiPropertyOptional({ enum: InspectionType })
  @IsOptional()
  @IsEnum(InspectionType)
  type?: InspectionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  principalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  principalRegNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  principalQualification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  inspectionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  finalRemarks?: string;
}

export class UpdateRequirementDto {
  @ApiProperty({ enum: RequirementStatus, description: 'ok = accepted, reject = N/A' })
  @IsEnum(RequirementStatus)
  status: RequirementStatus;
}

export class AddCommentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  text: string;
}

export class FeeLineItemDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  remainingFee?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  selected?: boolean;
}

export class UpdateFeeDetailsDto {
  @ApiPropertyOptional({ type: [FeeLineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeLineItemDto)
  lineItems?: FeeLineItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalPayable?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  paidAmount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  challanReference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccount?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class SubmitInspectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  finalRemarks?: string;
}

export class SupervisorReviewDto {
  @ApiProperty({ enum: ['approve', 'reject', 'request_changes'] })
  @IsString()
  action: 'approve' | 'reject' | 'request_changes';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}

export class AssignInspectionDto {
  @ApiProperty()
  @IsUUID()
  inspectorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supervisorId?: string;
}
