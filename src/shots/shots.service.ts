import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Shot } from './entities/shot.entity';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { Todo, TodoStatus } from '@/todos/entities/todo.entity';
import { Workspace } from '@/workspaces/entities/workspace.entity';
import { AiService } from '@/ai/ai.service';
import { User } from '@/users/entities/user.entity';
import { BadgesService } from '@/badges/badges.service';
import { BadgeType } from '@/badges/entities/user-badge.entity';
import { UploadsService } from '@/uploads/uploads.service';
import sharp from 'sharp';
import { Stream } from 'stream';


@Injectable()
export class ShotsService {
  constructor(
    @InjectRepository(Shot)
    private readonly shotRepository: Repository<Shot>,
    @InjectRepository(Todo)
    private readonly todoRepository: Repository<Todo>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly aiService: AiService,
    private readonly badgesService: BadgesService,
    private readonly uploadsService: UploadsService,
  ) {}

  async findAll(workspaceId: string) {
    return this.shotRepository.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 업로드 확정 로직:
   * 1. DB에 Shot 기록
   * 2. Gemini AI 검증 결과 부착
   * 3. 투두 완료 처리
   * 4. 워크스페이스 진행도 갱신 브릿지 (여기서 직접 호출 혹은 리턴)
   */
  async confirmUpload(userId: string, dto: ConfirmUploadDto): Promise<Shot> {
    const { objectKey, todoId, workspaceId } = dto;

    // 1. 유효성 검사
    const todo = await this.todoRepository.findOneBy({ id: todoId, workspaceId });
    if (!todo) throw new NotFoundException('해당 투두 항목을 찾을 수 없습니다.');

    // 2. 공개 URI 생성 (R2 퍼블릭 도메인 활용)
    const publicDomain = this.configService.get<string>('S3_PUBLIC_DOMAIN');
    const imageUri = `${publicDomain}/${objectKey}`;

    // 3. 실시간 AI 검증 (S3에서 직접 버퍼 로드)
    const imageBuffer = await this.uploadsService.getFileBuffer(objectKey);
    const aiResult = await this.aiService.verifyImage(imageBuffer, todo.label);

    // 4. Shot 데이터 생성
    const shot = this.shotRepository.create({
      userId,
      workspaceId,
      todoId,
      imageUri,
      aiVerification: aiResult,
    });
    const savedShot = await this.shotRepository.save(shot);

    // 5. 투두 상태 업데이트
    if (todo.status !== TodoStatus.COMPLETED) {
      await this.todoRepository.update(todoId, { status: TodoStatus.COMPLETED });
    }

    // 6. 투두 이미지 배열에 추가 (역호환성)
    const currentImages = todo.images || [];
    if (!currentImages.includes(imageUri)) {
      await this.todoRepository.update(todoId, {
        images: [...currentImages, imageUri],
      });
    }

    // 7. 사용자 총 촬영 수 업데이트
    await this.userRepository.increment({ id: userId }, 'totalShots', 1);

    // 8. 첫 촬영 배지 지급 (비동기)
    const user = await this.userRepository.findOneBy({ id: userId });
    if (user && user.totalShots === 1) {
      this.badgesService.grantBadge(userId, BadgeType.FIRST_SHOT).catch(err => {
        console.error('[ShotsService] Failed to grant first_shot badge:', err);
      });
    }

    return savedShot;
  }

  async deleteShot(userId: string, id: string): Promise<void> {
    const shot = await this.shotRepository.findOneBy({ id, userId });
    if (!shot) throw new NotFoundException('사진을 찾을 수 없습니다.');

    await this.shotRepository.softDelete(id);
    
    // 연관된 투두의 이미지 배열에서도 삭제 (필요 시)
    const todo = await this.todoRepository.findOneBy({ id: shot.todoId });
    if (todo && todo.images) {
      const updatedImages = todo.images.filter(uri => uri !== shot.imageUri);
      await this.todoRepository.update(shot.todoId, {
        images: updatedImages,
        status: updatedImages.length === 0 ? TodoStatus.PENDING : TodoStatus.COMPLETED,
      });
    }
  }

  /**
   * 썸네일 이미지 생성을 위한 버퍼 반환
   */
  async getThumbnail(id: string, w?: number, h?: number, fit: keyof sharp.FitEnum = 'cover'): Promise<Buffer> {
    const shot = await this.shotRepository.findOneBy({ id });
    if (!shot) throw new NotFoundException('촬영물을 찾을 수 없습니다.');

    // 1. imageUri에서 objectKey 추출
    const publicDomain = this.configService.get<string>('S3_PUBLIC_DOMAIN');
    const objectKey = shot.imageUri.replace(`${publicDomain}/`, '');

    // 2. S3에서 원본 데이터 로드
    const buffer = await this.uploadsService.getFileBuffer(objectKey);

    // 3. Sharp를 이용한 리사이징
    let transformer = sharp(buffer);
    if (w || h) {
      transformer = transformer.resize({
        width: w ? Number(w) : undefined,
        height: h ? Number(h) : undefined,
        fit,
      });
    }

    return transformer.toBuffer();
  }

  /**
   * 원본 사진 데이터 및 파일명 반환 (다운로드용)
   */
  async getShotImage(id: string): Promise<{ buffer: Buffer; fileName: string }> {
    const shot = await this.shotRepository.findOneBy({ id });
    if (!shot) throw new NotFoundException('촬영물을 찾을 수 없습니다.');

    const publicDomain = this.configService.get<string>('S3_PUBLIC_DOMAIN');
    const objectKey = shot.imageUri.replace(`${publicDomain}/`, '');
    const buffer = await this.uploadsService.getFileBuffer(objectKey);

    // 파일명 추출 (경로의 마지막 부분)
    const fileName = objectKey.split('/').pop() || 'image.jpg';

    return { buffer, fileName };
  }
}
