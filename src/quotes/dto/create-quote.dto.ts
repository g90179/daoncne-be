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
  privacyAgreement: boolean; // 🔥 추가
}