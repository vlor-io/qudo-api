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
        autoLoadEntities: true, // 앞으로 만들 엔티티 자동 인식
        synchronize: configService.get<string>('NODE_ENV') !== 'production', // 개발 환경에서만 스키마 자동 동기화 활성화
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
