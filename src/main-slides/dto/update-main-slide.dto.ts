// daon-backend/src/main-slides/dto/update-main-slide.dto.ts
import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';

export class UpdateMainSlideDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isExposed?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: '슬라이드 시간은 최소 1초 이상이어야 합니다.' })
  duration?: number;
}