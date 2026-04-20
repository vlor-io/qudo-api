import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { Workspace } from '@/workspaces/entities/workspace.entity';
import { User } from '@/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Workspace, User])],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}

