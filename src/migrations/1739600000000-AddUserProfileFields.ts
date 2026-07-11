import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProfileFields1739600000000 implements MigrationInterface {
  name = 'AddUserProfileFields1739600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "phone" character varying(30),
      ADD COLUMN IF NOT EXISTS "nic" character varying(20),
      ADD COLUMN IF NOT EXISTS "designation" character varying(150),
      ADD COLUMN IF NOT EXISTS "address" character varying(500),
      ADD COLUMN IF NOT EXISTS "office_details" character varying(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "phone",
      DROP COLUMN IF EXISTS "nic",
      DROP COLUMN IF EXISTS "designation",
      DROP COLUMN IF EXISTS "address",
      DROP COLUMN IF EXISTS "office_details"
    `);
  }
}
