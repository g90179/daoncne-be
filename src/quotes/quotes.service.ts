// daon-backend/src/quotes/quotes.service.ts
import { Injectable, BadRequestException, ForbiddenException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto'; // 🔑 이 줄이 빠져있을 확률이 높습니다. 추가해 주세요!

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  // 🛡️ 서버 메모리 보관소 (시간과 정답은 여기서 비밀리에 관리됩니다)
  private tokensMap = new Map<string, { createdAt: number; captchaSolved: boolean }>();
  private quizMap = new Map<string, { answer: number; expiresAt: number }>();

  // ① 글쓰기 탭 진입 시 대기표 끊어주기
  initToken() {
    const tid = Math.random().toString(36).substring(2, 10); // 평범한 8자리 문자열 생성
    this.tokensMap.set(tid, { createdAt: Date.now(), captchaSolved: false });
    
    // 메모리 누수 방지: 30분 지나면 대기표 자동 파기
    setTimeout(() => this.tokensMap.delete(tid), 30 * 60 * 1000);
    return { tid };
  }

  // 🤖 캡차 생성기 우회 개편
  // ② 로봇으로 의심될 때만 사칙연산 문제 발급하기
  generateCaptcha() {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    const answer = num1 + num2;
    
    const cid = Math.random().toString(36).substring(2, 10);
    this.quizMap.set(cid, { answer, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5분 유효

    setTimeout(() => this.quizMap.delete(cid), 5 * 60 * 1000);

    return {
      question: `${num1} + ${num2} = ?`,
      cid,
    };
  }

  // ③ 글 저장 및 토큰 검증 시스템
  async create(createQuoteDto: CreateQuoteDto) {
    // 🔑 [수정] 구조분해 할당에 email_confirm 추가
    const { tid, cid, ans, email_confirm, ...quoteData } = createQuoteDto;

    const token = this.tokensMap.get(tid);
    if (!token) {
      throw new BadRequestException('세션이 만료되었습니다. 페이지를 새로고침 해주세요.');
    }

    // 1️⃣ [수정] 숨겨진 허니팟 인풋을 로봇 매크로가 채웠는지 검증라인 부활
    if (email_confirm && email_confirm.trim() !== '') {
      throw new BadRequestException('Invalid submission.');
    }

    // 작성 속도 계산 (서버 시간 기준)
    const duration = (Date.now() - token.createdAt) / 1000;
    
    // 🔬 검수 임계값 200초 가동 규칙 반영
    const isSuspected = duration < 200.0 || cid;

    if (isSuspected && !token.captchaSolved) {
      if (!cid || !ans) {
        throw new ForbiddenException('CAPTCHA_REQUIRED');
      }

      const quiz = this.quizMap.get(cid);
      if (!quiz || Date.now() > quiz.expiresAt) {
        throw new BadRequestException('인증 시간이 만료되었습니다. 새로운 문제를 풀어주세요.');
      }

      if (parseInt(ans.trim(), 10) !== quiz.answer) {
        throw new BadRequestException('자동 등록 방지 코드가 일치하지 않습니다.');
      }

      token.captchaSolved = true;
      this.quizMap.delete(cid);
    }

    this.tokensMap.delete(tid);
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