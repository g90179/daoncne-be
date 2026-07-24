// src/visitor/visitor.module.ts
import { Module } from '@nestjs/common';
import { VisitorController } from './visitor.controller';
import { VisitorService } from './visitor.service';
import { PrismaService } from '../prisma.service'; // 프로젝트 구조에 맞는 PrismaService 경로 확인

@Module({
  controllers: [VisitorController],
  providers: [VisitorService, PrismaService],
})
export class VisitorModule {}