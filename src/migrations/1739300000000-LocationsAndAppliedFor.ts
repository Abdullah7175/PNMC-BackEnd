import { MigrationInterface, QueryRunner } from 'typeorm';

export class LocationsAndAppliedFor1739300000000 implements MigrationInterface {
  name = 'LocationsAndAppliedFor1739300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "provinces" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying(150) NOT NULL,
        "code" character varying(50),
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_provinces_name" UNIQUE ("name"),
        CONSTRAINT "PK_provinces" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "districts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "province_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "code" character varying(50),
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_districts_province_name" UNIQUE ("province_id", "name"),
        CONSTRAINT "PK_districts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_districts_province"
          FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_districts_province_id" ON "districts" ("province_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "applied_for_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying(150) NOT NULL,
        "code" character varying(50) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_applied_for_categories_code" UNIQUE ("code"),
        CONSTRAINT "PK_applied_for_categories" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "inspections"
      ADD COLUMN IF NOT EXISTS "province_id" uuid,
      ADD COLUMN IF NOT EXISTS "district_id" uuid,
      ADD COLUMN IF NOT EXISTS "applied_for_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "inspections"
      ADD CONSTRAINT "FK_inspections_province"
        FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "inspections"
      ADD CONSTRAINT "FK_inspections_district"
        FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "inspections"
      ADD CONSTRAINT "FK_inspections_applied_for"
        FOREIGN KEY ("applied_for_id") REFERENCES "applied_for_categories"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "inspections" DROP CONSTRAINT IF EXISTS "FK_inspections_applied_for"
    `);
    await queryRunner.query(`
      ALTER TABLE "inspections" DROP CONSTRAINT IF EXISTS "FK_inspections_district"
    `);
    await queryRunner.query(`
      ALTER TABLE "inspections" DROP CONSTRAINT IF EXISTS "FK_inspections_province"
    `);
    await queryRunner.query(`
      ALTER TABLE "inspections"
      DROP COLUMN IF EXISTS "applied_for_id",
      DROP COLUMN IF EXISTS "district_id",
      DROP COLUMN IF EXISTS "province_id"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "applied_for_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "districts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "provinces"`);
  }
}
