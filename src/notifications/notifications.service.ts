import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async findAll(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(userId: string, id: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }
    await this.notificationRepository.update(id, { isRead: true });
  }

  async create(userId: string, type: NotificationType, title: string, content: string, link?: string): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      type,
      title,
      content,
      link,
    });
    return this.notificationRepository.save(notification);
  }
}
