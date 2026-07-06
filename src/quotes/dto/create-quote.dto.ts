// daon-backend/src/quotes/dto/create-quote.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEmail, MinLength, IsNumber } from 'class-validator';

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

  // 🛡️ [스텔스 우회 보완] 가비아 방화벽을 완벽히 속이는 청정 변수들만 남김
  @IsString()
  @IsOptional()
  email_confirm?: string; // 🍯 honeyPot 변장

  @IsNumber()
  @IsNotEmpty()
  plt: number;           // ⏱️ pageLoadedAt 변장

  @IsString()
  @IsOptional()
  ans?: string;          // 🤖 captchaAnswer 변장

  @IsString()
  @IsOptional()
  cc?: string;           // 🤖 captchaHash 변장 (8자리 압축 해시)

  @IsNumber()
  @IsOptional()
  exp?: number;          // 🤖 captchaExpiry 변장
}