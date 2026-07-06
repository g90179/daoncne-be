//daon-backend\src\main-slides\main-slides.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMainSlideDto } from './dto/create-main-slide.dto';
import { UpdateMainSlideDto } from './dto/update-main-slide.dto';

@Injectable()
export class MainSlidesService {
  constructor(private readonly prisma: PrismaService) {}

  // 👑 관리자: 슬라이드 등록
  async create(createMainSlideDto: CreateMainSlideDto) {
    return await this.prisma.mainSlide.create({ data: createMainSlideDto });
  }

  // 👑 관리자: 전체 목록 조회 (관리용)
  async findAll() {
    return await this.prisma.mainSlide.findMany({ orderBy: { id: 'desc' } });
  }

  // 🌍 일반 유저: 메인 배너용 노출 중인 슬라이드만 조회
  async findExposed() {
    return await this.prisma.mainSlide.findMany({
      where: { isExposed: true },
      orderBy: { id: 'desc' }, // 혹은 정렬 순서 필드가 있다면 그것으로 정렬
    });
  }

  // 👑 관리자: 상세 조회
  async findOne(id: number) {
    const slide = await this.prisma.mainSlide.findUnique({ where: { id } });
    if (!slide) throw new NotFoundException('해당 슬라이드를 찾을 수 없습니다.');
    return slide;
  }

  // 👑 관리자: 수정
  async update(id: number, updateMainSlideDto: UpdateMainSlideDto) {
    await this.findOne(id);
    return await this.prisma.mainSlide.update({
      where: { id },
      data: updateMainSlideDto,
    });
  }

  // 👑 관리자: 삭제
  async remove(id: number) {
    await this.findOne(id);
    return await this.prisma.mainSlide.delete({ where: { id } });
  }
}