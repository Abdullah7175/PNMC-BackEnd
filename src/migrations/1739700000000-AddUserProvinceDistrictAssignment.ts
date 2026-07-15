import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProvinceDistrictAssignment1739700000000
  implements MigrationInterface
{
  name = 'AddUserProvinceDistrictAssignment1739700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "province_id" uuid,
      ADD COLUMN IF NOT EXISTS "district_id" uuid
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "users"
          ADD CONSTRAINT "FK_users_province_id"
          FOREIGN KEY ("province_id") REFERENCES "provinces"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "users"
          ADD CONSTRAINT "FK_users_district_id"
          FOREIGN KEY ("district_id") REFERENCES "districts"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_province_id" ON "users" ("province_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_district_id" ON "users" ("district_id")
    `);

    // Backfill IDs from existing string province/district names
    await queryRunner.query(`
      UPDATE "users" u
      SET "province_id" = p.id
      FROM "provinces" p
      WHERE u."province_id" IS NULL
        AND u."province" IS NOT NULL
        AND lower(trim(u."province")) = lower(trim(p."name"))
    `);

    await queryRunner.query(`
      UPDATE "users" u
      SET
        "district_id" = d.id,
        "province_id" = COALESCE(u."province_id", d."province_id")
      FROM "districts" d
      WHERE u."district_id" IS NULL
        AND u."district" IS NOT NULL
        AND lower(trim(u."district")) = lower(trim(d."name"))
        AND (u."province_id" IS NULL OR u."province_id" = d."province_id")
    `);

    // Sync display names from linked master records
    await queryRunner.query(`
      UPDATE "users" u
      SET "province" = p."name"
      FROM "provinces" p
      WHERE u."province_id" = p.id
    `);

    await queryRunner.query(`
      UPDATE "users" u
      SET "district" = d."name"
      FROM "districts" d
      WHERE u."district_id" = d.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_district_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_province_id"`);
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_district_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_province_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "district_id",
      DROP COLUMN IF EXISTS "province_id"
    `);
  }
}
