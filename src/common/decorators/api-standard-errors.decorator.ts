import { applyDecorators } from '@nestjs/common';
import { ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';

const TS_EXAMPLE = '2026-04-19T02:00:00.000Z';

type ExampleCase = {
  code: string;
  message: string;
  details?: any;
};

function buildExample(path: string, code: string, message: string, details: any = null) {
  return {
    success: false,
    error: { code, message, details },
    timestamp: TS_EXAMPLE,
    path,
  };
}

function buildExamples(path: string, cases: Record<string, ExampleCase>) {
  return Object.fromEntries(
    Object.entries(cases).map(([key, c]) => [
      key,
      { value: buildExample(path, c.code, c.message, c.details ?? null) },
    ]),
  );
}

/**
 * `type: ErrorResponseDto` 를 같이 주면 NestJS Swagger 가 ApiProperty 기본값으로
 * `example`(단수) 을 자동 생성해 `examples`(복수) 를 덮어쓴다.
 * 따라서 `type` 은 쓰지 않고 schema 는 `$ref` 로만 참조한다.
 * (ErrorResponseDto 는 main.ts 의 SwaggerModule.createDocument extraModels 에 등록돼 있음)
 */
function errorResponseContent(
  examples?: Record<string, any>,
  example?: any,
) {
  const media: Record<string, any> = {
    schema: { $ref: getSchemaPath(ErrorResponseDto) },
  };
  if (examples) media.examples = examples;
  else if (example) media.example = example;

  return { 'application/json': media };
}

/**
 * 401 — 인증 실패 (JwtAuthGuard 전방위 커버)
 * 토큰 만료/누락/형식 오류/서명 불일치 등 모든 JWT 실패 케이스를 포함합니다.
 */
export function ApiAuthErrors(path = '/v1/...') {
  return ApiResponse({
    status: 401,
    description: '인증 실패 (토큰 누락/만료/형식 오류 등)',
    content: errorResponseContent(
      buildExamples(path, {
        '토큰 만료': { code: 'TOKEN_EXPIRED', message: '인증 토큰이 만료되었습니다. 다시 로그인해주세요.' },
        '토큰 누락': { code: 'MISSING_TOKEN', message: '인증 헤더(Authorization)가 누락되었습니다.' },
        '유효하지 않은 토큰': { code: 'INVALID_TOKEN', message: '유효하지 않은 토큰 형식입니다.' },
        '일반 인증 실패': { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' },
      }),
    ),
  });
}

/**
 * 403 — 접근/권한 부족
 */
export function ApiForbiddenError(options?: {
  path?: string;
  code?: string;
  message?: string;
  description?: string;
}) {
  const {
    path = '/v1/...',
    code = 'FORBIDDEN',
    message = '해당 자원에 대한 접근 권한이 없습니다.',
    description = '권한 부족 (접근 불가)',
  } = options ?? {};

  return ApiResponse({
    status: 403,
    description,
    content: errorResponseContent(undefined, buildExample(path, code, message)),
  });
}

/**
 * 404 — 리소스 없음 (단일/다중 케이스 지원)
 */
export function ApiNotFoundError(options: {
  path?: string;
  description?: string;
  message?: string;
  code?: string;
  cases?: Record<string, ExampleCase>;
}) {
  const {
    path = '/v1/...',
    description = '리소스를 찾을 수 없음',
    code = 'NOT_FOUND',
    message,
    cases,
  } = options;

  return ApiResponse({
    status: 404,
    description,
    content: errorResponseContent(
      cases ? buildExamples(path, cases) : undefined,
      cases ? undefined : buildExample(path, code, message ?? '해당 리소스를 찾을 수 없습니다.'),
    ),
  });
}

/**
 * 400 — 입력값 검증 실패 (ValidationPipe, 커스텀 BadRequest 포함)
 */
export function ApiBadRequestError(options?: {
  path?: string;
  description?: string;
  cases?: Record<string, ExampleCase>;
  validationDetails?: string[];
}) {
  const {
    path = '/v1/...',
    description = '입력값 오류 (DTO 검증 실패 등)',
    cases,
    validationDetails,
  } = options ?? {};

  const defaultCases: Record<string, ExampleCase> = {
    'DTO 검증 실패': {
      code: 'BAD_REQUEST',
      message: 'Validation Failed',
      details: validationDetails ?? ['field must not be empty'],
    },
  };

  return ApiResponse({
    status: 400,
    description,
    content: errorResponseContent(buildExamples(path, cases ?? defaultCases)),
  });
}

/**
 * 409 — 충돌 (중복 리소스, 상태 중복 처리 등)
 */
export function ApiConflictError(options: {
  path?: string;
  description?: string;
  code?: string;
  message?: string;
  cases?: Record<string, ExampleCase>;
}) {
  const {
    path = '/v1/...',
    description = '상태 충돌 (중복/재처리 불가)',
    code = 'CONFLICT',
    message,
    cases,
  } = options;

  return ApiResponse({
    status: 409,
    description,
    content: errorResponseContent(
      cases ? buildExamples(path, cases) : undefined,
      cases ? undefined : buildExample(path, code, message ?? '요청이 현재 상태와 충돌합니다.'),
    ),
  });
}

/**
 * 500 — 서버 내부 오류
 */
export function ApiInternalError(options?: { path?: string; message?: string }) {
  const {
    path = '/v1/...',
    message = '서버 내부에서 예상치 못한 오류가 발생했습니다.',
  } = options ?? {};

  return ApiResponse({
    status: 500,
    description: '서버 내부 오류',
    content: errorResponseContent(
      undefined,
      buildExample(path, 'INTERNAL_SERVER_ERROR', message),
    ),
  });
}

/**
 * JwtAuthGuard 가 걸린 엔드포인트 기본 세트: 401 + 403 + 500.
 */
export function ApiStandardErrors(path = '/v1/...') {
  return applyDecorators(
    ApiAuthErrors(path),
    ApiForbiddenError({ path }),
    ApiInternalError({ path }),
  );
}

/**
 * 비인증(public) 엔드포인트 기본 세트: 500 만 추가.
 */
export function ApiPublicStandardErrors(path = '/v1/...') {
  return applyDecorators(ApiInternalError({ path }));
}
