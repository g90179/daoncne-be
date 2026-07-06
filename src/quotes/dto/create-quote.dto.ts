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
  privacyAgreement: boolean; // 🔥 추가

  @IsString()
  @IsOptional()
  honeyPot?: string;

  @IsNumber()
  @IsNotEmpty()
  pageLoadedAt: number;

  @IsString()
  @IsOptional()
  captchaAnswer?: string;

  // 🛡️ [우회책] 특수문자 없는 순수 Hex 문자열 필드로 변경
  @IsString()
  @IsOptional()
  captchaHash?: string;

  // 🛡️ [우회책] 순수 숫자 타임스탬프 필드로 변경
  @IsNumber()
  @IsOptional()
  captchaExpiry?: number;
}