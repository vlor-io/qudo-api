import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveAppleAndHardDelete1777873039981 implements MigrationInterface {
    name = 'RemoveAppleAndHardDelete1777873039981'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 안전 검증: apple provider 인 row 가 있으면 enum drop 실패. 사전 차단.
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM oauth_identities WHERE provider = 'apple') THEN
                    RAISE EXCEPTION 'Cannot remove apple provider: % rows exist. Delete those rows first.',
                        (SELECT COUNT(*) FROM oauth_identities WHERE provider = 'apple');
                END IF;
            END $$;
        `);

        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "oauth_identities" DROP CONSTRAINT "uq_oauth_provider_pid"`);
        await queryRunner.query(`ALTER TYPE "public"."oauth_identities_provider_enum" RENAME TO "oauth_identities_provider_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."oauth_identities_provider_enum" AS ENUM('kakao', 'naver', 'google')`);
        await queryRunner.query(`ALTER TABLE "oauth_identities" ALTER COLUMN "provider" TYPE "public"."oauth_identities_provider_enum" USING "provider"::"text"::"public"."oauth_identities_provider_enum"`);
        await queryRunner.query(`DROP TYPE "public"."oauth_identities_provider_enum_old"`);
        await queryRunner.query(`ALTER TABLE "oauth_identities" ADD CONSTRAINT "uq_oauth_provider_pid" UNIQUE ("provider", "providerId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oauth_identities" DROP CONSTRAINT "uq_oauth_provider_pid"`);
        await queryRunner.query(`CREATE TYPE "public"."oauth_identities_provider_enum_old" AS ENUM('kakao', 'naver', 'google', 'apple')`);
        await queryRunner.query(`ALTER TABLE "oauth_identities" ALTER COLUMN "provider" TYPE "public"."oauth_identities_provider_enum_old" USING "provider"::"text"::"public"."oauth_identities_provider_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."oauth_identities_provider_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."oauth_identities_provider_enum_old" RENAME TO "oauth_identities_provider_enum"`);
        await queryRunner.query(`ALTER TABLE "oauth_identities" ADD CONSTRAINT "uq_oauth_provider_pid" UNIQUE ("provider", "providerId")`);
        await queryRunner.query(`ALTER TABLE "users" ADD "deletedAt" TIMESTAMP`);
    }

}
