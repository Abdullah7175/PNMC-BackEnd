import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1739123456789 implements MigrationInterface {
  name = 'InitSchema1739123456789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await queryRunner.query(`
      CREATE TYPE "inspection_type_enum" AS ENUM('newInspection', 'enhancement', 'reinspection', 'eveningShift');
      CREATE TYPE "inspection_status_enum" AS ENUM('draft', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected', 'changes_requested', 'resubmitted');
      CREATE TYPE "requirement_status_enum" AS ENUM('pending', 'ok', 'reject');
    `);

    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "code" character varying(100) NOT NULL,
        "name" character varying(150) NOT NULL,
        "page" character varying(100) NOT NULL,
        "action" character varying(50) NOT NULL,
        "description" text,
        CONSTRAINT "UQ_permissions_code" UNIQUE ("code"),
        CONSTRAINT "PK_permissions" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "code" character varying(100) NOT NULL,
        "name" character varying(150) NOT NULL,
        "description" text,
        "is_system" boolean NOT NULL DEFAULT false,
        CONSTRAINT "UQ_roles_code" UNIQUE ("code"),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "full_name" character varying(255) NOT NULL,
        "employee_id" character varying(50),
        "province" character varying(100),
        "district" character varying(100),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id"),
        CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "checklist_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying(255) NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "is_active" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_checklist_templates" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "checklist_requirements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "template_id" uuid NOT NULL,
        "number" integer NOT NULL,
        "flag" character varying(50) NOT NULL,
        "category" character varying(255) NOT NULL,
        "title" character varying(500) NOT NULL,
        "provision" text NOT NULL,
        "regulation_ref" character varying(255),
        "sort_order" integer NOT NULL,
        CONSTRAINT "PK_checklist_requirements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_checklist_requirements_template" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "inspections" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "inspection_code" character varying(50) NOT NULL,
        "template_id" uuid NOT NULL,
        "template_version" integer NOT NULL,
        "inspector_id" uuid,
        "supervisor_id" uuid,
        "institute_name" character varying(500) NOT NULL,
        "district" character varying(100),
        "province" character varying(100),
        "applied_for" character varying(100),
        "inspection_type" "inspection_type_enum" NOT NULL DEFAULT 'newInspection',
        "inspection_date" date,
        "assigned_date" date,
        "principal_name" character varying(255),
        "principal_reg_no" character varying(100),
        "principal_qualification" character varying(255),
        "final_remarks" text,
        "signature_file_path" character varying(500),
        "submitted_at" TIMESTAMP WITH TIME ZONE,
        "status" "inspection_status_enum" NOT NULL DEFAULT 'draft',
        "supervisor_remarks" text,
        "reviewed_at" TIMESTAMP WITH TIME ZONE,
        "reviewed_by" uuid,
        "synced_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_inspections_code" UNIQUE ("inspection_code"),
        CONSTRAINT "PK_inspections" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inspections_inspector" FOREIGN KEY ("inspector_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_inspections_supervisor" FOREIGN KEY ("supervisor_id") REFERENCES "users"("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "inspection_requirement_responses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "inspection_id" uuid NOT NULL,
        "requirement_id" uuid NOT NULL,
        "requirement_number" integer NOT NULL,
        "status" "requirement_status_enum" NOT NULL DEFAULT 'pending',
        "reviewed_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_inspection_requirement_responses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_responses_inspection" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_responses_requirement" FOREIGN KEY ("requirement_id") REFERENCES "checklist_requirements"("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "requirement_comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "response_id" uuid NOT NULL,
        "author_id" uuid NOT NULL,
        "author_name" character varying(255) NOT NULL,
        "text" text NOT NULL,
        CONSTRAINT "PK_requirement_comments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_comments_response" FOREIGN KEY ("response_id") REFERENCES "inspection_requirement_responses"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "requirement_attachments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "response_id" uuid NOT NULL,
        "inspection_id" uuid NOT NULL,
        "file_name" character varying(255) NOT NULL,
        "file_path" character varying(500) NOT NULL,
        "file_size" integer NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "uploaded_by" uuid NOT NULL,
        CONSTRAINT "PK_requirement_attachments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_attachments_response" FOREIGN KEY ("response_id") REFERENCES "inspection_requirement_responses"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "entity_type" character varying(100) NOT NULL,
        "entity_id" uuid NOT NULL,
        "action" character varying(100) NOT NULL,
        "actor_id" uuid,
        "old_value" jsonb,
        "new_value" jsonb,
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "requirement_attachments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "requirement_comments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inspection_requirement_responses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inspections"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "checklist_requirements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "checklist_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "requirement_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "inspection_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "inspection_type_enum"`);
  }
}
