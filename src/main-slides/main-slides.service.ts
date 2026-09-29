//daon-backend\src\main-slides\main-slides.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMainSlideDto } from './dto/create-main-slide.dto';
import { UpdateMainSlideDto } from './dto/update-main-slide.dto';

@Injectable()
export class MainSlidesService {
  constructor(private readonly prisma: PrismaService) {}

  // 👑 관리자: 슬라이드 등록 - 새 슬라이드는 항상 맨 뒤(가장 큰 order + 1)에 붙인다.
  async create(createMainSlideDto: CreateMainSlideDto) {
    const last = await this.prisma.mainSlide.findFirst({ orderBy: { order: 'desc' } });
    return await this.prisma.mainSlide.create({
      data: { ...createMainSlideDto, order: (last?.order ?? -1) + 1 },
    });
  }

  // 👑 관리자: 전체 목록 조회 (관리용) - 관리자가 드래그로 정한 순서대로.
  async findAll() {
    return await this.prisma.mainSlide.findMany({ orderBy: { order: 'asc' } });
  }

  // 🌍 일반 유저: 메인 배너용 노출 중인 슬라이드만 조회
  async findExposed() {
    return await this.prisma.mainSlide.findMany({
      where: { isExposed: true },
      orderBy: { order: 'asc' },
    });
  }

  // 👑 관리자: 노출 순서 일괄 변경 - 프론트에서 드래그로 정렬한 뒤 전체 id 배열을 보내면
  // 그 배열 순서대로 order(0, 1, 2, ...)를 다시 매긴다.
  async reorder(ids: number[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.mainSlide.update({ where: { id }, data: { order: index } }),
      ),
    );
    return this.findAll();
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