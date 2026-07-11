import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir =
      this.configService.get<string>('UPLOAD_DIR') ?? './uploads';
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  saveFile(
    inspectionId: string,
    subPath: string,
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ) {
    const ext = extname(originalName) || (mimeType.includes('png') ? '.png' : '.jpg');
    const fileName = `${uuidv4()}${ext}`;
    const relativePath = join('inspections', inspectionId, subPath, fileName);
    const fullPath = join(this.uploadDir, relativePath);
    const dir = join(this.uploadDir, 'inspections', inspectionId, subPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, buffer);
    return {
      fileName: originalName,
      filePath: relativePath.replace(/\\/g, '/'),
      fileSize: buffer.length,
      mimeType,
    };
  }

  saveSignature(inspectionId: string, buffer: Buffer, mimeType: string) {
    const ext = mimeType.includes('png') ? '.png' : '.jpg';
    const relativePath = join('inspections', inspectionId, `signature${ext}`);
    const fullPath = join(this.uploadDir, relativePath);
    const dir = join(this.uploadDir, 'inspections', inspectionId);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, buffer);
    return {
      filePath: relativePath.replace(/\\/g, '/'),
      fileSize: buffer.length,
      mimeType,
    };
  }

  getPublicUrl(filePath: string, baseUrl: string) {
    return `${baseUrl}/files/${filePath}`;
  }

  validateImage(file: Express.Multer.File, maxMb = 5) {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG and PNG images are allowed');
    }
    if (file.size > maxMb * 1024 * 1024) {
      throw new BadRequestException(`File exceeds ${maxMb}MB limit`);
    }
  }

  /** Evidence: images or PDF up to 10 MB */
  validateEvidenceFile(file: Express.Multer.File, maxMb = 10) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
    ];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, or PDF files are allowed');
    }
    if (file.size > maxMb * 1024 * 1024) {
      throw new BadRequestException(`File exceeds ${maxMb}MB limit`);
    }
  }
}
