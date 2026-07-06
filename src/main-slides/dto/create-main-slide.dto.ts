// daon-backend\src\main-slides\dto\create-main-slide.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';

export class CreateMainSlideDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  videoUrl: string;

  @IsNotEmpty()
  @IsBoolean()
  isExposed: boolean;

  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: '슬라이드 시간은 최소 1초 이상이어야 합니다.' })
  duration: number;
}