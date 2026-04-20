import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo, TodoStatus } from './entities/todo.entity';
import { CreateTodoDto } from './dto/create-todo.dto';

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepository: Repository<Todo>,
  ) {}

  async findAllByWorkspace(workspaceId: string): Promise<Todo[]> {
    return this.todoRepository.find({
      where: { workspaceId },
      order: { order: 'ASC' },
    });
  }

  async create(workspaceId: string, dto: CreateTodoDto): Promise<Todo> {
    const todo = this.todoRepository.create({
      ...dto,
      workspaceId,
      status: TodoStatus.PENDING,
      images: [],
    });
    return this.todoRepository.save(todo);
  }

  async update(id: string, updateData: Partial<Todo>): Promise<Todo> {
    const todo = await this.todoRepository.findOne({ where: { id } });
    if (!todo) {
      throw new NotFoundException('해당 투두 항목을 찾을 수 없습니다.');
    }
    Object.assign(todo, updateData);
    return this.todoRepository.save(todo);
  }

  async remove(id: string): Promise<void> {
    const result = await this.todoRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('해당 투두 항목을 찾을 수 없습니다.');
    }
  }

  async toggleStatus(id: string): Promise<Todo> {
    const todo = await this.todoRepository.findOne({ where: { id } });
    if (!todo) {
      throw new NotFoundException('해당 투두 항목을 찾을 수 없습니다.');
    }
    todo.status = todo.status === TodoStatus.PENDING ? TodoStatus.COMPLETED : TodoStatus.PENDING;
    return this.todoRepository.save(todo);
  }

  async reorder(workspaceId: string, todoIds: string[]): Promise<void> {
    await Promise.all(
      todoIds.map((id, index) =>
        this.todoRepository.update(id, { order: index }),
      ),
    );
  }
}
