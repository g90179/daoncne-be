// daon-backend/src/main-slides/dto/reorder-main-slide.dto.ts
import { IsArray, IsInt } from 'class-validator';

export class ReorderMainSlideDto {
  @IsArray()
  @IsInt({ each: true })
  ids: number[];
}
