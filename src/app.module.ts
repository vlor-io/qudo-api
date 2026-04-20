import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { UsersModule } from '@/users/users.module';
import { AuthModule } from '@/auth/auth.module';
import { UploadsModule } from '@/uploads/uploads.module';
import { WorkspacesModule } from '@/workspaces/workspaces.module';
import { TodosModule } from '@/todos/todos.module';
import { CampaignsModule } from '@/campaigns/campaigns.module';
import { ApplicationsModule } from '@/applications/applications.module';
import { AiModule } from '@/ai/ai.module';
import { BadgesModule } from '@/badges/badges.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { SubscriptionsModule } from '@/subscriptions/subscriptions.module';
import { ShotsModule } from '@/shots/shots.module';

@Module({
  imports: [
    // 1. 전역 환경변수(Config) 모듈 세팅
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      expandVariables: true,
    }),
    
    // 2. TypeORM (PostgreSQL) 연결 세팅
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST'),
        port: configService.get<number>('POSTGRES_PORT'),
        username: configService.get<string>('POSTGRES_USER'),
        password: configService.get<string>('POSTGRES_PASSWORD'),
        database: configService.get<string>('POSTGRES_DB'),
        autoLoadEntities: true,
        // synchronize 우선순위:
        //   1) DB_SYNCHRONIZE=true 이면 무조건 ON (첫 배포/초기 세팅용)
        //   2) 아니면 NODE_ENV=development 일 때만 ON
        //   운영 안정화 후에는 .env 에서 DB_SYNCHRONIZE 제거(또는 false) 후 마이그레이션 사용
        synchronize:
          configService.get<string>('DB_SYNCHRONIZE') === 'true' ||
          configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),

    // 3. 비즈니스 로직 모듈
    UsersModule,
    AuthModule,
    UploadsModule,
    WorkspacesModule,
    TodosModule,
    CampaignsModule,
    ApplicationsModule,
    AiModule,
    BadgesModule,
    NotificationsModule,
    SubscriptionsModule,
    ShotsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
