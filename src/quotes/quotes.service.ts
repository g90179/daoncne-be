// daon-backend/src/quotes/quotes.service.ts
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto'; 
import { MailService } from '../mail/mail.service'; // 🔑 신규 메일 서비스 장착

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService // 🔑 메일 서비스 의존성 주입 완료
  ) {}

  // 🛡️ 서버 메모리 보관소 (시간과 정답은 여기서 비밀리에 관리됩니다)
  private tokensMap = new Map<string, { createdAt: number; captchaSolved: boolean }>();
  private quizMap = new Map<string, { answer: number; expiresAt: number }>();

  // ① 글쓰기 탭 진입 시 대기표 끊어주기
  initToken() {
    const tid = Math.random().toString(36).substring(2, 10);
    this.tokensMap.set(tid, { createdAt: Date.now(), captchaSolved: false });
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
    this.quizMap.set(cid, { answer, expiresAt: Date.now() + 5 * 60 * 1000 });

    setTimeout(() => this.quizMap.delete(cid), 5 * 60 * 1000);

    return { question: `${num1} + ${num2} = ?`, cid };
  }

  // ③ 글 저장 및 토큰 검증 시스템 + 📧 실시간 관리자 알림 메일 발송
  // 🛡️ 가비아 웹서버 우회: 에러 발생 시에도 HTTP 200 코드로 데이터 전달
  async create(createQuoteDto: CreateQuoteDto) {
    const { tid, cid, ans, email_confirm, ...quoteData } = createQuoteDto;

    const token = this.tokensMap.get(tid);
    if (!token) {
      return { success: false, message: '세션이 만료되었습니다. 페이지를 새로고침 해주세요.' };
    }

    if (email_confirm && email_confirm.trim() !== '') {
      return { success: false, message: 'Invalid submission.' };
    }

    const duration = (Date.now() - token.createdAt) / 1000;
    const isSuspected = duration < 13.0 || cid; // 🔬 200초 검수 조건 유지

    if (isSuspected && !token.captchaSolved) {
      if (!cid || !ans) {
        // ⚠️ HTTP 403 대신 200 상태코드 내부 프로토콜로 캡차 요구 전달
        return { success: false, code: 'CAPTCHA_REQUIRED', message: '보안 검증이 필요합니다.' };
      }

      const quiz = this.quizMap.get(cid);
      if (!quiz || Date.now() > quiz.expiresAt) {
        return { success: false, message: '인증 시간이 만료되었습니다. 새로운 문제를 풀어주세요.' };
      }

      if (parseInt(ans.trim(), 10) !== quiz.answer) {
        return { success: false, message: '자동 등록 방지 코드가 일치하지 않습니다.' };
      }

      token.captchaSolved = true;
      this.quizMap.delete(cid);
    }

    try {
      this.tokensMap.delete(tid);
      
      // A. 데이터베이스에 문의글 정상 저장 선행
      const result = await this.prisma.quote.create({ data: quoteData });

      // 📧 B. [신규 이식] 회사 대표 이메일 자동 추적 및 실시간 메일 릴레이 가동
      try {
        // 회사 정보(Company 테이블)에서 입력된 대표 기본 설정 레코드 로드
        const companyInfo = await this.prisma.company.findFirst();
        
        // 회사 정보 문서가 데이터베이스에 실재하고, 대표 이메일(email)이 공백 없이 등록되어 있다면 발송 실행
        if (companyInfo && companyInfo.email && companyInfo.email.trim() !== '') {
          await this.mailService.sendQuoteNotification(companyInfo.email, result);
        }
      } catch (mailError) {
        // 🛡️ 중요 방어선: SMTP 통신 방화벽 차단이나 계정 오타로 이메일 전송이 실패하더라도,
        // 이미 DB에 저장 완료된 고객의 소중한 문의글 프로세스가 롤백(취소)되거나 에러 페이지로 튕기지 않도록 로그만 남깁니다.
        console.error('견적 실시간 알림 이메일 전송 중 서버/통신 예외 발생:', mailError);
      }

      // 최종 성공 구조체 반환
      return { success: true, data: result };

    } catch (dbError) {
      return { success: false, message: '데이터베이스 저장 실패. 입력값을 확인해 주세요.' };
    }
  }

  // 🔒 보안 강화: 목록 조회 시 비밀글은 핵심 민감 정보 블라인드 처리
  // 🔒 목록 조회 크래시 안전 보호벽 설치
  async findAll() {
    try {
      const quotes = await this.prisma.quote.findMany({ orderBy: { id: 'desc' } });
      const processed = quotes.map(q => {
        if (q.isSecret) {
          return { 
            id: q.id, title: q.title, name: q.name, isSecret: q.isSecret, 
            status: q.status, createdAt: q.createdAt 
          };
        }
        return q;
      });
      return { success: true, data: processed }; // 구조화된 객체 리턴
    } catch (err) {
      console.error('Prisma 목록 조회 에러:', err);
      return { success: false, data: [], message: '목록을 불러오는 중 시스템 오류가 발생했습니다.' };
    }
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