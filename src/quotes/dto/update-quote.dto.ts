// daon-backend/src/quotes/dto/update-quote.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateQuoteDto } from './create-quote.dto';

export class UpdateQuoteDto extends PartialType(CreateQuoteDto) {
  // 🔑 password 검증 시 타입스크립트 에러를 방지하기 위해 명시적 선언 추가
  password?: string;
}