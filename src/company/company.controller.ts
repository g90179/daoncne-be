// daon-backend\src\company\company.controller.ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CompanyService } from './company.service';
// 🔑 별도 파일 대신, NestJS 내장 패스포트 라이브러리에서 가드를 바로 가져옵니다!
import { AuthGuard } from '@nestjs/passport';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // 🔓 조회(GET)는 로그아웃 상태에서도 무조건 작동하도록 전체 공개!
  @Get()
  async getCompany() {
    return this.companyService.getCompanyInfo();
  }

  // 🔒 저장/수정(POST)은 로그인한 사람만 가능하도록 내장 가드로 보호!
  @Post()
  @UseGuards(AuthGuard('jwt')) // 🔑 내장 가드 적용
  async saveCompany(
    @Body()
    body: {
      name?: string;
      ceo?: string;
      bizNumber?: string;
      address?: string;
      addressDetail?: string;
      phone?: string;
      email?: string;
      fax?: string;
      lat?: number;
      lng?: number;
    },
  ) {
    return this.companyService.upsertCompanyInfo(body);
  }
}