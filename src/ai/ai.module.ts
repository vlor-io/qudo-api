import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';

@Global() // 모든 모듈에서 사용할 수 있도록 Global로 설정
@Module({
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
