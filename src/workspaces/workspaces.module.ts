import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { Workspace } from './entities/workspace.entity';
import { ShareLink } from './entities/share-link.entity';
import { SignatureShot } from './entities/signature-shot.entity';
import { Todo } from '@/todos/entities/todo.entity';
import { TodosModule } from '@/todos/todos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workspace, ShareLink, SignatureShot, Todo]),
    TodosModule,
  ],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
