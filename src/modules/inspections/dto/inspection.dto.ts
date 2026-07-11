import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InspectionType } from '../../../common/enums/inspection.enum';
import { RequirementStatus } from '../../../common/enums/requirement.enum';

export class CreateInspectionDto {
  @ApiProperty({ example: 'Abc Nursing Institute' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  instituteName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional({ description: 'Preferred: province UUID from lookups' })
  @IsOptional()
  @IsUUID('4')
  provinceId?: string;

  @ApiPropertyOptional({ description: 'Preferred: district UUID from lookups' })
  @IsOptional()
  @IsUUID('4')
  districtId?: string;

  @ApiPropertyOptional({ example: 'BSN' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  appliedFor?: string;

  @ApiPropertyOptional({ description: 'Preferred: applied-for UUID from lookups' })
  @IsOptional()
  @IsUUID('4')
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
  @MaxLength(255)
  principalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  principalRegNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  principalQualification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  inspectionDate?: string;

  @ApiPropertyOptional({ description: 'Client-generated UUID for offline sync' })
  @IsOptional()
  @IsUUID('4')
  clientId?: string;
}

export class UpdateInspectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  instituteName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  provinceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  districtId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  appliedFor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  appliedForId?: string;

  @ApiPropertyOptional({ enum: InspectionType })
  @IsOptional()
  @IsEnum(InspectionType)
  type?: InspectionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  principalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  principalRegNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
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
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  text: string;
}

export class FeeLineItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999)
  amount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999)
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
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => FeeLineItemDto)
  lineItems?: FeeLineItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999)
  totalPayable?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999)
  paidAmount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  challanReference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankAccount?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
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
  @IsIn(['approve', 'reject', 'request_changes'])
  action: 'approve' | 'reject' | 'request_changes';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}

export class AssignInspectionDto {
  @ApiProperty()
  @IsUUID('4')
  inspectorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  supervisorId?: string;
}
