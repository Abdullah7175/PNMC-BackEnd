import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  STRICT_EMAIL_MESSAGE,
  STRICT_EMAIL_REGEX,
} from '../../../common/validation/security.constants';
import { Transform } from 'class-transformer';

export enum LoginClient {
  PORTAL = 'portal',
  MOBILE = 'mobile',
}

export class LoginDto {
  @ApiProperty({ example: 'admin@pnmc.gov.pk' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(STRICT_EMAIL_REGEX, { message: STRICT_EMAIL_MESSAGE })
  email: string;

  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password: string;

  @ApiPropertyOptional({
    enum: LoginClient,
    description:
      'portal = supervisor web portal (blocks mobile users). mobile = Flutter app (blocks portal-only users).',
    default: LoginClient.PORTAL,
  })
  @IsOptional()
  @IsEnum(LoginClient)
  client?: LoginClient;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  refreshToken: string;
}
