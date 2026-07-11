import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, extname, basename } from 'path';
import { v4 as uuidv4 } from 'uuid';

const MAGIC: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/jpg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

@Injectable()
export class StorageService {
  private uploadDir: string;
  private apiPrefix: string;

  constructor(private configService: ConfigService) {
    this.uploadDir =
      this.configService.get<string>('UPLOAD_DIR') ?? './uploads';
    this.apiPrefix = this.configService.get<string>('API_PREFIX') ?? 'api/v1';
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private sanitizeOriginalName(name: string) {
    const base = basename(name || 'file').replace(/[^\w.\-]+/g, '_');
    return base.slice(0, 120) || 'file';
  }

  private detectMimeFromMagic(buffer: Buffer): string | null {
    for (const [mime, signatures] of Object.entries(MAGIC)) {
      for (const sig of signatures) {
        if (buffer.length >= sig.length && sig.every((b, i) => buffer[i] === b)) {
          return mime === 'image/jpg' ? 'image/jpeg' : mime;
        }
      }
    }
    return null;
  }

  private assertMagicMatches(file: Express.Multer.File, allowed: string[]) {
    const detected = this.detectMimeFromMagic(file.buffer);
    if (!detected || !allowed.includes(detected)) {
      throw new BadRequestException(
        'File content does not match an allowed type (JPEG, PNG, or PDF)',
      );
    }
    // Prefer magic-detected type over client-supplied mimetype
    file.mimetype = detected;
  }

  saveFile(
    inspectionId: string,
    subPath: string,
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ) {
    const safeExt =
      extname(this.sanitizeOriginalName(originalName)).toLowerCase() ||
      (mimeType.includes('png')
        ? '.png'
        : mimeType.includes('pdf')
          ? '.pdf'
          : '.jpg');
    const allowedExt = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = allowedExt.includes(safeExt) ? safeExt : '.bin';
    const fileName = `${uuidv4()}${ext}`;
    const relativePath = join('inspections', inspectionId, subPath, fileName);
    const fullPath = join(this.uploadDir, relativePath);
    const dir = join(this.uploadDir, 'inspections', inspectionId, subPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, buffer);
    return {
      fileName: this.sanitizeOriginalName(originalName),
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

  /** Time-limited signed URL (OWASP — no public unauthenticated file dump) */
  getPublicUrl(filePath: string, baseUrl: string, ttlSeconds = 3600) {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const sig = this.signPath(filePath, exp);
    const encoded = filePath
      .split('/')
      .map((p) => encodeURIComponent(p))
      .join('/');
    return `${baseUrl}/${this.apiPrefix}/files/${encoded}?exp=${exp}&sig=${sig}`;
  }

  signPath(filePath: string, exp: number) {
    const secret =
      this.configService.get<string>('JWT_SECRET') ??
      this.configService.get<string>('FILE_SIGNING_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is required for file URL signing');
    }
    return createHmac('sha256', secret)
      .update(`${filePath}:${exp}`)
      .digest('hex');
  }

  verifySignedUrl(filePath: string, exp: string | undefined, sig: string | undefined) {
    if (!exp || !sig) return false;
    const expNum = parseInt(exp, 10);
    if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000)) {
      return false;
    }
    const expected = this.signPath(filePath, expNum);
    try {
      const a = Buffer.from(expected, 'utf8');
      const b = Buffer.from(sig, 'utf8');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  resolveAbsolutePath(filePath: string) {
    const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (
      normalized.includes('..') ||
      normalized.startsWith('/') ||
      !normalized.startsWith('inspections/')
    ) {
      throw new BadRequestException('Invalid file path');
    }
    return join(this.uploadDir, normalized);
  }

  validateImage(file: Express.Multer.File, maxMb = 5) {
    if (!file?.buffer) {
      throw new BadRequestException('File is required');
    }
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG and PNG images are allowed');
    }
    if (file.size > maxMb * 1024 * 1024) {
      throw new BadRequestException(`File exceeds ${maxMb}MB limit`);
    }
    this.assertMagicMatches(file, ['image/jpeg', 'image/png']);
  }

  /** Evidence: images or PDF up to 10 MB */
  validateEvidenceFile(file: Express.Multer.File, maxMb = 10) {
    if (!file?.buffer) {
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
    this.assertMagicMatches(file, [
      'image/jpeg',
      'image/png',
      'application/pdf',
    ]);
  }
}
