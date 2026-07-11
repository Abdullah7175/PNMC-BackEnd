import { MigrationInterface, QueryRunner } from 'typeorm';

export class MobileUsersAndOfficialChecklist1739200000000
  implements MigrationInterface
{
  name = 'MobileUsersAndOfficialChecklist1739200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "is_mobile_user" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "checklist_requirements"
      ADD COLUMN IF NOT EXISTS "has_fee_details" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inspection_fee_details" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "inspection_id" uuid NOT NULL,
        "line_items" jsonb NOT NULL DEFAULT '[]',
        "total_payable" numeric(12,2),
        "paid_amount" numeric(12,2),
        "challan_reference" character varying(255),
        "bank_account" character varying(255),
        "notes" text,
        CONSTRAINT "UQ_inspection_fee_details_inspection" UNIQUE ("inspection_id"),
        CONSTRAINT "PK_inspection_fee_details" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inspection_fee_details_inspection"
          FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "inspection_fee_details"`);
    await queryRunner.query(`
      ALTER TABLE "checklist_requirements" DROP COLUMN IF EXISTS "has_fee_details"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "is_mobile_user"
    `);
  }
}
