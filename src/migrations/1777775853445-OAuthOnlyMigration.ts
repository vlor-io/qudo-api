import { MigrationInterface, QueryRunner } from "typeorm";

export class OAuthOnlyMigration1777775853445 implements MigrationInterface {
    name = 'OAuthOnlyMigration1777775853445'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // OAuth 전환 컷오버: 기존 user 데이터를 일괄 삭제. CASCADE 로 자식 테이블
        // (workspaces/todos/shots/campaigns/applications/notifications/subscriptions/badges/channels/share-links/signature-shots) 도 함께 비워짐.
        // 개발 단계 합의에 따른 1회성 데이터 정리.
        await queryRunner.query(`TRUNCATE TABLE "users" CASCADE`);

        await queryRunner.query(`CREATE TYPE "public"."oauth_identities_provider_enum" AS ENUM('kakao', 'naver', 'google', 'apple')`);
        await queryRunner.query(`CREATE TABLE "oauth_identities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "provider" "public"."oauth_identities_provider_enum" NOT NULL, "providerId" character varying(255) NOT NULL, "email" character varying(255), "displayName" character varying(100), "avatarUri" character varying(500), "lastLoginAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "uq_oauth_provider_pid" UNIQUE ("provider", "providerId"), CONSTRAINT "PK_095205cf320039e4ce248933681" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_oauth_user" ON "oauth_identities" ("userId") `);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordHash"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_fab34e0791096b2a0a1bf8bd7ff"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "providerId"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_285991faeecf8cdfe55a61b33bb"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "workspaceKey"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3"`);
        await queryRunner.query(`ALTER TABLE "oauth_identities" ADD CONSTRAINT "FK_b731ba99f5f90815d56cd295c45" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oauth_identities" DROP CONSTRAINT "FK_b731ba99f5f90815d56cd295c45"`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")`);
        await queryRunner.query(`ALTER TABLE "users" ADD "workspaceKey" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_285991faeecf8cdfe55a61b33bb" UNIQUE ("workspaceKey")`);
        await queryRunner.query(`ALTER TABLE "users" ADD "providerId" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_fab34e0791096b2a0a1bf8bd7ff" UNIQUE ("providerId")`);
        await queryRunner.query(`ALTER TABLE "users" ADD "passwordHash" character varying`);
        await queryRunner.query(`DROP INDEX "public"."idx_oauth_user"`);
        await queryRunner.query(`DROP TABLE "oauth_identities"`);
        await queryRunner.query(`DROP TYPE "public"."oauth_identities_provider_enum"`);
    }

}
