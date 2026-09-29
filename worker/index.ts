// daon-backend/worker/index.ts
// Cloudflare Worker 진입점 - 실제 로직은 전부 Dockerfile 로 패키징된 NestJS 컨테이너에 있고,
// 이 Worker는 모든 요청을 그 컨테이너로 그대로 포워딩하는 얇은 라우터 역할만 한다.
// 고정된 이름(daon-backend)으로 항상 같은 컨테이너 인스턴스(들)을 가리키게 한다 - 요청마다
// 다른 인스턴스를 새로 띄우는 게 아니라, 지금처럼 "상시 구동 서버 하나"와 동일하게 동작해야
// 하기 때문이다(세션별로 다른 컨테이너가 필요한 시나리오가 아님).
import { Container } from '@cloudflare/containers';

interface Env {
  DAON_BACKEND: DurableObjectNamespace<DaonBackendContainer>;
  DATABASE_URL: string;
  JWT_SECRET: string;
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASS: string;
  FRONTEND_URL: string;
  NTS_SERVICE_KEY: string;
  R2_BUCKET: string;
  R2_ENDPOINT: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  API_PUBLIC_URL: string;
  R2_PUBLIC_URL: string;
}

export class DaonBackendContainer extends Container<Env> {
  defaultPort = 8080;
  // 트래픽이 없어도 바로 재우지 않는다 - 매 요청마다 콜드스타트가 나면 SMTP/DB 커넥션을 다시
  // 맺어야 해서 느려진다. 필요하면 나중에 조정.
  sleepAfter = '10m';
  // 기본값이 false라 켜지 않으면 MySQL(Gabia)/SMTP/R2 같은 외부 연결이 전부 막혀서, 앱이
  // DB 연결을 기다리다 포트(8080)를 못 열고 타임아웃난다.
  enableInternet = true;

  // Cloudflare 대시보드에 등록한 시크릿은 Worker의 env로만 들어오고 컨테이너 프로세스에는
  // 자동으로 전달되지 않는다 - 여기서 명시적으로 넘겨줘야 NestJS 앱이 DB/SMTP/R2에 접속할 수
  // 있다(이게 빠져서 컨테이너가 부팅 직후 크래시하고 있었다).
  // 값이 없는 시크릿을 그대로 넣으면 컨테이너 쪽에서 문자열 "undefined"로 새어들어가
  // 코드의 자체 fallback 로직을 무력화한다(실제로 API_PUBLIC_URL 미등록 상태에서 발생했던
  // 문제) - 등록된 값만 골라서 넘긴다. envVars는 베이스 클래스의 일반 프로퍼티라 접근자로
  // 재정의할 수 없어 생성자에서 직접 계산해 대입한다.
  envVars: Record<string, string>;

  constructor(ctx: DurableObjectState<Record<string, never>>, env: Env) {
    super(ctx, env);
    const candidates: Record<string, string | undefined> = {
      DATABASE_URL: env.DATABASE_URL,
      JWT_SECRET: env.JWT_SECRET,
      SMTP_HOST: env.SMTP_HOST,
      SMTP_PORT: env.SMTP_PORT,
      SMTP_USER: env.SMTP_USER,
      SMTP_PASS: env.SMTP_PASS,
      FRONTEND_URL: env.FRONTEND_URL,
      NTS_SERVICE_KEY: env.NTS_SERVICE_KEY,
      R2_BUCKET: env.R2_BUCKET,
      R2_ENDPOINT: env.R2_ENDPOINT,
      R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
      API_PUBLIC_URL: env.API_PUBLIC_URL,
      R2_PUBLIC_URL: env.R2_PUBLIC_URL,
    };
    this.envVars = Object.fromEntries(
      Object.entries(candidates).filter(([, v]) => v !== undefined),
    ) as Record<string, string>;
  }
}

// 자주 안 바뀌는 공개 조회 API - 홈페이지가 새로고침될 때마다 매번 이 작은 컨테이너
// 인스턴스를 거치지 않도록, Cloudflare 엣지(Cache API)에 짧게 캐싱해서 재방문/동시접속을
// 훨씬 빠르게 만든다. 글자 그대로 시작하는 경로만(쿼리스트링 포함 전체 URL이 캐시 키) -
// 관리자 전용 API(/main-slides 전체 목록, CRUD 등)는 대상이 아니다.
const EDGE_CACHE_PATHS = ['/main-slides/exposed', '/company', '/posts', '/map-positions', '/home-bootstrap'];
const EDGE_CACHE_SECONDS = 30;

function isEdgeCacheable(request: Request): boolean {
  if (request.method !== 'GET') return false;
  const { pathname } = new URL(request.url);
  return EDGE_CACHE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(`${p}?`));
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const cache = (caches as unknown as { default: Cache }).default;
    const cacheable = isEdgeCacheable(request);
    if (cacheable) {
      const cached = await cache.match(request);
      if (cached) return cached;
    }

    // 컨테이너 인스턴스는 떠 있는 동안(sleepAfter 전) 새 이미지를 배포해도 재시작 전까지
    // 예전 코드를 계속 실행한다 - 배포 직후 바로 테스트하면 계속 예전 코드를 보게 되므로,
    // 코드가 바뀌는 배포 직후에는 이 이름을 한 번씩 bump해 강제로 새 인스턴스를 띄운다.
    const instance = env.DAON_BACKEND.getByName('daon-backend-v8');
    const response = await instance.fetch(request);

    if (cacheable && response.ok) {
      const toCache = new Response(response.body, response);
      toCache.headers.set('Cache-Control', `public, max-age=${EDGE_CACHE_SECONDS}`);
      ctx.waitUntil(cache.put(request, toCache.clone()));
      return toCache;
    }
    return response;
  },
} satisfies ExportedHandler<Env>;
