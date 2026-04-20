import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ErrorResponseDto, ErrorDetails } from './common/dto/error-response.dto';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 전역 예외 필터 적용
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 전역 유효성 검사 파이프 설정
  app.useGlobalPipes(

    new ValidationPipe({
      whitelist: true, // DTO에 없는 필드는 제거
      forbidNonWhitelisted: true, // DTO에 없는 필드가 있으면 에러 발생
      transform: true, // 데이터 타입을 DTO에 정의된 대로 자동 변환
    }),


  );

  const config = new DocumentBuilder()
    .setTitle('Qudo API — Backend Identity & Infrastructure')
    .setDescription(
      'Qudo 백엔드 API 서비스 명세서입니다. ' +
      '이메일/소셜 로그인, 프로필 관리, 워크스페이스 및 투두 관리 기능을 테스트할 수 있습니다. ' +
      '\n\n[테스트 가이드]\n1. Auth > register API로 회원가입하거나 login/social API로 토큰을 발급받습니다.\n2. 상단 Authorize 버튼에 발급받은 accessToken을 입력합니다.\n3. 이후 권한이 필요한 API를 자유롭게 호출합니다.',
    )
    .setVersion('1.1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'accessToken 문자열만 입력해주세요.',
        in: 'header',
      },
      'bearer', // 이 이름을 컨트롤러의 @ApiBearerAuth()와 일치시킴
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ErrorResponseDto, ErrorDetails],
  });
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
