import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { extname } from 'path';
import { Public } from '../../common/decorators/permissions.decorator';
import { StorageService } from '../storage/storage.service';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
};

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  private assertSafe(...parts: string[]) {
    if (parts.some((p) => !p || p.includes('..') || p.includes('/') || p.includes('\\'))) {
      throw new NotFoundException('File not found');
    }
  }

  private streamFile(filePath: string, exp: string, sig: string, res: Response) {
    if (!this.storage.verifySignedUrl(filePath, exp, sig)) {
      throw new UnauthorizedException('Invalid or expired file link');
    }

    let absolute: string;
    try {
      absolute = this.storage.resolveAbsolutePath(filePath);
    } catch {
      throw new NotFoundException('File not found');
    }

    if (!existsSync(absolute)) {
      throw new NotFoundException('File not found');
    }

    const ext = extname(absolute).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    createReadStream(absolute).pipe(res);
  }

  /** Signature: inspections/{id}/signature.png */
  @Public()
  @Get('inspections/:inspectionId/:fileName')
  rootFile(
    @Param('inspectionId') inspectionId: string,
    @Param('fileName') fileName: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    this.assertSafe(inspectionId, fileName);
    this.streamFile(`inspections/${inspectionId}/${fileName}`, exp, sig, res);
  }

  /** inspections/{id}/{folder}/{file} */
  @Public()
  @Get('inspections/:inspectionId/:folder/:fileName')
  nestedFile(
    @Param('inspectionId') inspectionId: string,
    @Param('folder') folder: string,
    @Param('fileName') fileName: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    this.assertSafe(inspectionId, folder, fileName);
    this.streamFile(
      `inspections/${inspectionId}/${folder}/${fileName}`,
      exp,
      sig,
      res,
    );
  }

  /** Evidence: inspections/{id}/requirements/{responseId}/{file} */
  @Public()
  @Get('inspections/:inspectionId/:folder/:subId/:fileName')
  deepFile(
    @Param('inspectionId') inspectionId: string,
    @Param('folder') folder: string,
    @Param('subId') subId: string,
    @Param('fileName') fileName: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    this.assertSafe(inspectionId, folder, subId, fileName);
    this.streamFile(
      `inspections/${inspectionId}/${folder}/${subId}/${fileName}`,
      exp,
      sig,
      res,
    );
  }
}
