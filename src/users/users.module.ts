import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Channel } from './entities/channel.entity';
import { OAuthIdentity } from './entities/oauth-identity.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UploadsModule } from '@/uploads/uploads.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Channel, OAuthIdentity]),
    UploadsModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
