import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../entities/audit-log.entity';
import { User } from '../../entities/user.entity';

export type AuditSource = 'portal' | 'mobile' | 'system';

export interface AuditLogInput {
  entityType: string;
  entityId?: string | null;
  action: string;
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  source?: AuditSource;
  description?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async log(input: AuditLogInput) {
    let actorName = input.actorName ?? null;
    let actorEmail = input.actorEmail ?? null;

    if (input.actorId && (!actorName || !actorEmail)) {
      const actor = await this.userRepo.findOne({
        where: { id: input.actorId },
      });
      if (actor) {
        actorName = actorName ?? actor.fullName;
        actorEmail = actorEmail ?? actor.email;
      }
    }

    const entry = this.auditRepo.create({
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      action: input.action,
      actorId: input.actorId ?? null,
      actorName,
      actorEmail,
      source: input.source ?? 'portal',
      description: input.description ?? null,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
    });

    try {
      return await this.auditRepo.save(entry);
    } catch (err) {
      // Never break business flow because of audit failure
      console.error('Audit log failed:', err);
      return null;
    }
  }

  findAll(options?: {
    limit?: number;
    source?: string;
    actorId?: string;
    entityType?: string;
  }) {
    const qb = this.auditRepo
      .createQueryBuilder('a')
      .orderBy('a.created_at', 'DESC')
      .take(options?.limit ?? 200);

    if (options?.source) {
      qb.andWhere('a.source = :source', { source: options.source });
    }
    if (options?.actorId) {
      qb.andWhere('a.actor_id = :actorId', { actorId: options.actorId });
    }
    if (options?.entityType) {
      qb.andWhere('a.entity_type = :entityType', {
        entityType: options.entityType,
      });
    }

    return qb.getMany();
  }

  findForActor(actorId: string, limit = 50) {
    return this.auditRepo.find({
      where: { actorId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
