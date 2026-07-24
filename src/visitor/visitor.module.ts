// src/visitor/visitor.module.ts
import { Module } from '@nestjs/common';
import { VisitorController } from './visitor.controller';
import { VisitorService } from './visitor.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [VisitorController],
  providers: [VisitorService, PrismaService],
})
export class VisitorModule {}