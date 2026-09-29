// daon-backend/src/home/home.controller.ts
// 홈페이지 진입 시 MainVideoBanner/HomeView/KoreaArchiveMap 세 컴포넌트가 각자
// main-slides/exposed, posts?category=..., company, map-positions 네 번 따로 API를 불렀다.
// 작은 컨테이너 인스턴스(vCPU 0.25) 하나가 이 네 개를 동시에 처리하느라 새로고침 체감이
// 느렸다 - 한 번의 요청으로 전부 묶어서 내려주면 컨테이너 왕복 자체가 1번으로 준다.
import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MainSlidesService } from '../main-slides/main-slides.service';
import { CompanyService } from '../company/company.service';
import { MapPositionsService } from '../map-positions/map-positions.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('home-bootstrap')
export class HomeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mainSlides: MainSlidesService,
    private readonly company: CompanyService,
    private readonly mapPositions: MapPositionsService,
  ) {}

  @Public()
  @Get()
  async get(@Query('category') category: string = '공사실적') {
    const [slides, posts, companyInfo, mapPositionsList] = await Promise.all([
      this.mainSlides.findExposed(),
      this.prisma.post.findMany({
        where: { category },
        include: { files: true, keywords: { include: { keyword: true } } },
        orderBy: { id: 'desc' },
      }),
      this.company.getCompanyInfo(),
      this.mapPositions.findAll(),
    ]);
    return { slides, posts, company: companyInfo, mapPositions: mapPositionsList };
  }
}
