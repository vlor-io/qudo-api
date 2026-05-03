import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { KakaoVerifier } from './verifiers/kakao.verifier';
import { NaverVerifier } from './verifiers/naver.verifier';
import { GoogleVerifier } from './verifiers/google.verifier';
import { AppleVerifier } from './verifiers/apple.verifier';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { 
          expiresIn: `${configService.get<number>('JWT_ACCESS_TTL') || 3600}s` 
        },
      }),

    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, KakaoVerifier, NaverVerifier, GoogleVerifier, AppleVerifier],
  exports: [AuthService],
})
export class AuthModule {}
