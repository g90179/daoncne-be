// src/quotes/quotes.service.ts
import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createQuoteDto: CreateQuoteDto) {
    return await this.prisma.quote.create({ data: createQuoteDto });
  }

  // 🔒 보안 강화: 목록 조회 시 비밀글은 핵심 민감 정보 블라인드 처리
  async findAll() {
    const quotes = await this.prisma.quote.findMany({ orderBy: { id: 'desc' } });
    return quotes.map(q => {
      if (q.isSecret) {
        return { 
          id: q.id, title: q.title, name: q.name, isSecret: q.isSecret, 
          status: q.status, createdAt: q.createdAt 
        };
      }
      return q;
    });
  }

  // 🔍 단일 상세 조회 (관리자 전용)
  async findOne(id: number) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('해당 문의글을 찾을 수 없습니다.');
    return quote;
  }

  // 🔑 비밀번호 검증 후 상세 데이터 반환 (작성자용)
  async verifyAndPassword(id: number, password: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('해당 문의글을 찾을 수 없습니다.');
    if (quote.password !== password) throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    return quote;
  }

  // ✍️ 일반 수정 (수정 시에도 비밀번호 검증)
  async update(id: number, updateQuoteDto: UpdateQuoteDto) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('해당 문의글을 찾을 수 없습니다.');
    if (updateQuoteDto.password && quote.password !== updateQuoteDto.password) {
      throw new UnauthorizedException('비밀번호가 올바르지 않아 수정할 수 없습니다.');
    }
    return await this.prisma.quote.update({
      where: { id },
      data: updateQuoteDto,
    });
  }

  // 👑 관리자 답변 달기 및 상태 변경
  async addReply(id: number, reply: string) {
    return await this.prisma.quote.update({
      where: { id },
      data: {
        reply,
        status: reply.trim() ? '답변완료' : '접수대기',
        replyAt: new Date(),
      },
    });
  }
}