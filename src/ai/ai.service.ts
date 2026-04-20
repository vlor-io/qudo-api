import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AiVerificationResult {
  isRelevant: boolean;
  label: string;
  confidence: number;
  feedback: string;
}

@Injectable()
export class AiService {
  private readonly genAI: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Gemini API를 호출하여 이미지를 분석하고 투두 항목에 적합한지 검증합니다.
   * 이미지 Buffer를 직접 받아 분석 결과를 반환합니다.
   */
  async verifyImage(imageBuffer: Buffer, todoLabel: string): Promise<AiVerificationResult> {
    try {
      // 1. Gemini 모델 설정 (Vision 모델 사용)
      const modelName = this.configService.get<string>('GEMINI_MODEL') || 'gemini-1.5-flash';
      const model = this.genAI.getGenerativeModel({ model: modelName });

      // 3. 프롬프트 구성
      const prompt = `
        당신은 사진 가이드 검증 전문가입니다. 
        사용자가 찍은 사진이 지시된 투두 라벨 "${todoLabel}"과 얼마나 일치하는지 분석하세요.
        
        결과는 반드시 아래 JSON 형식으로만 답변하세요:
        {
          "isRelevant": true/false (지시사항을 충실히 따랐는가),
          "label": "${todoLabel}",
          "confidence": 0.0~1.0 사이의 수치,
          "feedback": "사용자에게 주는 부드러운 말투의 피드백 (예: 구도가 아주 좋습니다! 혹은 조금 더 가까이서 찍어주세요.)"
        }
      `;

      // 4. 모델 호출
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: Buffer.from(imageBuffer).toString('base64'),
            mimeType: 'image/jpeg',
          },
        },
      ]);

      const text = result.response.text();
      // JSON 파싱 (백틱이나 코드 블록이 포함될 수 있으므로 정제)
      const cleanedJson = text.replace(/```json|```/g, '').trim();
      const parsed: AiVerificationResult = JSON.parse(cleanedJson);

      return parsed;
    } catch (error) {
      console.error('[AiService] Error:', error);
      // 에러 발생 시 기본 통과 처리 (사용자 경험 저해 방지)
      return {
        isRelevant: true,
        label: todoLabel,
        confidence: 0.5,
        feedback: 'AI 분석 중 오류가 발생했지만, 사진을 저장했습니다.',
      };
    }
  }
}
