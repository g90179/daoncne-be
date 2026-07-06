// daon-backend/src/quotes/dto/create-quote.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEmail, MinLength } from 'class-validator';

export class CreateQuoteDto {
  @IsOptional()
  @IsString()
  company?: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  isSecret?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(4, { message: '비밀번호는 최소 4자리 이상이어야 합니다.' })
  password?: string;

  @IsBoolean()
  @IsNotEmpty()
  privacyAgreement: boolean;

  // 🛡️ [핸드셰이크 약어 변수] 가비아가 절대 의심하지 않는 일반 코드 형태
  @IsString()
  @IsNotEmpty()
  tid: string;  // 대기표 ID

  @IsString()
  @IsOptional()
  cid?: string; // 퀴즈표 ID

  @IsString()
  @IsOptional()
  ans?: string; // 사용자가 쓴 수학 정답

  // 🔑 [수정] 프론트엔드 페이로드와 싱크를 맞추기 위해 허니팟 필드 추가
  @IsString()
  @IsOptional()
  email_confirm?: string;
}