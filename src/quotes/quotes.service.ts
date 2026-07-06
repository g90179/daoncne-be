// src/quotes/quotes.service.ts
import { Injectable, BadRequestException, ForbiddenException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import * as crypto from 'crypto';

const CAPTCHA_SALT = 'daon_cne_captcha_secure_key_2026';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createQuoteDto: CreateQuoteDto) {
    const { honeyPot, pageLoadedAt, captchaAnswer, captchaToken, ...quoteData } = createQuoteDto;

    // 1️⃣ [허니팟 검증] 눈에 안 보이는 가짜 필드에 값이 적혀있다면 100% 로봇
    if (honeyPot && honeyPot.trim() !== '') {
      throw new BadRequestException('비정상적인 접근입니다. (Robot Detected)');
    }

    // 2️⃣ [속도 검증] 페이지 로드 후 제출까지 걸린 시간 계산
    const duration = (Date.now() - pageLoadedAt) / 1000; // 초 단위 변환

    // 3초 미만으로 제출했거나, 이미 한 번 의심받아 토큰이 발행된 경우 캡차 필수 검증
    const isSuspected = duration < 4.0 || captchaToken;

    if (isSuspected) {
      // 로봇으로 의심되는데 정답이나 토큰 중 하나라도 누락되었다면 캡차 요구 응답(Forbidden) 반환
      if (!captchaToken || !captchaAnswer) {
        throw new ForbiddenException('CAPTCHA_REQUIRED'); 
      }

      // 제출된 캡차 값 검증 작업 시작
      const [submittedHash, expiryStr] = captchaToken.split('.');
      const expiryTime = parseInt(expiryStr, 10);

      if (Date.now() > expiryTime) {
        throw new BadRequestException('인증 시간이 만료되었습니다. 다시 시도해 주세요.');
      }

      const expectedTokenData = `${captchaAnswer.trim()}_${expiryTime}`;
      const expectedHash = crypto.createHmac('sha256', CAPTCHA_SALT).update(expectedTokenData).digest('hex');

      if (submittedHash !== expectedHash) {
        throw new BadRequestException('자동 등록 방지 코드가 일치하지 않습니다.');
      }
    }
    // 🟢 일반 인간이거나 캡차를 완벽히 통과한 경우 안심하고 저장
    return await this.prisma.quote.create({ data: quoteData });
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