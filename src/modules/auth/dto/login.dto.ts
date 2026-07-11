import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LoginClient {
  PORTAL = 'portal',
  MOBILE = 'mobile',
}

export class LoginDto {
  @ApiProperty({ example: 'admin@pnmc.gov.pk' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  @MinLength(6)
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
  refreshToken: string;
}
