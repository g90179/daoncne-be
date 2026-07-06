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
  honeyPot?: string; // 🍯 로봇 낚시용 숨김 필드

  @IsNumber()
  @IsNotEmpty()
  pageLoadedAt: number; // ⏱️ 프론트엔드 페이지 로드 타임스탬프

  @IsString()
  @IsOptional()
  captchaAnswer?: string; // 정답 (의심 가동 시에만 필수)

  @IsString()
  @IsOptional()
  captchaToken?: string;  // 토큰 (의심 가동 시에만 필수)
}