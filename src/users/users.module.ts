import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Channel } from './entities/channel.entity';
import { OAuthIdentity } from './entities/oauth-identity.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UploadsModule } from '@/uploads/uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Channel, OAuthIdentity]),
    UploadsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
