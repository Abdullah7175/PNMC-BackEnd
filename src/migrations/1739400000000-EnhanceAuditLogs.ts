import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceAuditLogs1739400000000 implements MigrationInterface {
  name = 'EnhanceAuditLogs1739400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ALTER COLUMN "entity_id" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD COLUMN IF NOT EXISTS "actor_name" character varying(255),
      ADD COLUMN IF NOT EXISTS "actor_email" character varying(255),
      ADD COLUMN IF NOT EXISTS "source" character varying(20) NOT NULL DEFAULT 'portal',
      ADD COLUMN IF NOT EXISTS "description" text
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_actor_id" ON "audit_logs" ("actor_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_created_at" ON "audit_logs" ("created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_source" ON "audit_logs" ("source")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_source"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_actor_id"`);
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      DROP COLUMN IF EXISTS "description",
      DROP COLUMN IF EXISTS "source",
      DROP COLUMN IF EXISTS "actor_email",
      DROP COLUMN IF EXISTS "actor_name"
    `);
  }
}
