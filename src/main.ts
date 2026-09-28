// daon-backend\src\main.ts
import 'dotenv/config'; // 💡 반드시 최상단에 위치해야 합니다!
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express'; // 1. 이게 잘 서있는지 확인!

async function bootstrap() {
  // 2. 반드시 create 뒤에 <NestExpressApplication>이 붙어있어야 합니다!
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 💡 CORS 방어막 해제 설정 추가
  app.enableCors({
    origin: [
      'http://localhost:5173', // 로컬 개발용 프론트엔드 주소 허용
      'https://daoncne.co.kr', // 실제 배포될 프로덕션 프론트엔드 주소 허용
      'https://www.daoncne.co.kr',
      'http://rss.daoncne.co.kr',
      'https://rss.daoncne.co.kr', // 👈 추가: RSS 서브도메인 허용
    ],
    credentials: true, // 쿠키나 인증 헤더를 허용할 경우 필수
    // 🔑 핵심 추가: 프론트엔드가 보내는 Authorization 헤더를 백엔드가 거절하지 않도록 명시합니다.
    allowedHeaders: 'Content-Type, Authorization',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // 업로드 파일은 이제 로컬 uploads/ 폴더가 아니라 R2 에 저장되고, File.url 이 R2 공개 URL을
  // 그대로 담고 있으므로(FilesModule 참고) 여기서 정적 서빙할 필요가 없다(Containers 는 재배포
  // 때마다 이미지가 새로 뜨는 상시 컨테이너라, 로컬 디스크에 의존하면 재배포 시 업로드 파일이
  // 사라진다).

  await app.listen(8080);
}
bootstrap();