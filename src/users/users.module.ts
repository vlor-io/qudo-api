import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Channel } from './entities/channel.entity';
import { OAuthIdentity } from './entities/oauth-identity.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Channel, OAuthIdentity])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // AuthModule에서 사용할 수 있도록 export
})
export class UsersModule {}
