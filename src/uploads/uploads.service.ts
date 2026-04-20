import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Workspace } from '@/workspaces/entities/workspace.entity';
import { User } from '@/users/entities/user.entity';

interface PresignDto {
  fileName: string;
  contentType: string;
  todoId?: string;
  workspaceId: string;
  userId: string;
}

@Injectable()
export class UploadsService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    this.bucketName = this.configService.get<string>('S3_BUCKET');
    
    let endpoint = this.configService.get<string>('S3_ENDPOINT');
    const bucketInUrl = `/${this.bucketName}`;
    
    // 엔드포인트 끝에 버킷명이 포함되어 있다면 제거 (SDK가 버킷을 따로 붙이므로 중복 방지)
    if (endpoint && endpoint.endsWith(bucketInUrl)) {
      endpoint = endpoint.substring(0, endpoint.length - bucketInUrl.length);
    }

    const s3ForcePathStyle = this.configService.get<string | boolean>('S3_FORCE_PATH_STYLE');
    const forcePathStyle = String(s3ForcePathStyle).toLowerCase() === 'true';

    this.s3Client = new S3Client({
      region: this.configService.get<string>('S3_REGION') || 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY'),
        secretAccessKey: this.configService.get<string>('S3_SECRET_KEY'),
      },
      forcePathStyle: forcePathStyle,
    });
  }


  async getPresignedUrl(params: PresignDto) {
    try {
      const { fileName, contentType, todoId, workspaceId, userId } = params;

      // 1. 워크스페이스 및 유저 정보 조회
      const workspace = await this.workspaceRepository.findOne({
        where: { id: workspaceId, userId },
        relations: ['user'],
      });

      if (!workspace) {
        throw new NotFoundException('해당 워크스페이스를 찾을 수 없습니다.');
      }

      let user = workspace.user;
      
      // 2. 워크스페이스 키 확인 및 생성 (기존 유저 대응)
      if (!user.workspaceKey) {
        const timestamp = new Date().toISOString()
          .replace(/[-T:.Z]/g, '')
          .slice(2, 17);
        const random = crypto.randomBytes(4).toString('hex');
        user.workspaceKey = `${timestamp}_${random}`;
        
        await this.userRepository.update(user.id, { workspaceKey: user.workspaceKey });
      }

      // 3. 파일명 정규화 (공백 제거) 및 파일명 위계 구성
      const safeFileName = fileName.replace(/\s+/g, '_');
      const randomStr = Math.random().toString(36).substring(2, 8);
      
      // 사용자 요구사항 구조: {고유키}/{캠페인명}/shots/{파일명}
      // 캠페인명이 특수문자를 포함할 수 있으므로 공백 등 정규화 필요
      const safeCampaignTitle = workspace.title.replace(/\s+/g, '_');
      
      const prefix = `${user.workspaceKey}/${safeCampaignTitle}/shots`;
      const objectKey = `${prefix}/${todoId || 'direct'}_${randomStr}_${safeFileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      
      const publicDomain = this.configService.get<string>('S3_PUBLIC_DOMAIN');
      
      // 베이스 URL 결정 (커스텀 도메인 우선, 없으면 엔드포인트 활용)
      let baseUri = publicDomain;
      if (!baseUri) {
        const rawEndpoint = this.configService.get<string>('S3_ENDPOINT');
        // 엔드포인트에 이미 버킷명이 포함되어 있다면 그대로 쓰고, 아니면 붙여줌
        baseUri = rawEndpoint.endsWith(`/${this.bucketName}`)
          ? rawEndpoint
          : `${rawEndpoint}/${this.bucketName}`;
      }

      const fileUri = `${baseUri}/${objectKey}`;

      return {
        uploadUrl,
        fileUri,
        objectKey,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Presigned URL 발급 에러:', error);
      throw new InternalServerErrorException('파일 업로드 티켓을 발급하는 중 에러가 발생했습니다.');
    }
  }

  /**
   * S3(R2)에서 파일 데이터를 Buffer로 직접 가져옵니다.
   */
  async getFileBuffer(objectKey: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });

      const response = await this.s3Client.send(command);
      const chunks: any[] = [];
      const stream = response.Body as any;

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: any) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    } catch (error) {
      console.error('[UploadsService] getFileBuffer Error:', error);
      throw new InternalServerErrorException('저장소에서 파일을 읽어오는 중 에러가 발생했습니다.');
    }
  }
}
