import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShotsService } from './shots.service';
import { ShotsController } from './shots.controller';
import { Shot } from './entities/shot.entity';
import { Todo } from '@/todos/entities/todo.entity';
import { Workspace } from '@/workspaces/entities/workspace.entity';
import { User } from '@/users/entities/user.entity';
import { AiModule } from '@/ai/ai.module';
import { WorkspacesModule } from '@/workspaces/workspaces.module';
import { BadgesModule } from '@/badges/badges.module';
import { UploadsModule } from '@/uploads/uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shot, Todo, Workspace, User]),
    AiModule,
    WorkspacesModule,
    BadgesModule,
    UploadsModule,
  ],
  controllers: [ShotsController],
  providers: [ShotsService],
  exports: [ShotsService],
})
export class ShotsModule {}
