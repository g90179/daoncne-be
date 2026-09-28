// daon-backend/worker/index.ts
// Cloudflare Worker 진입점 - 실제 로직은 전부 Dockerfile 로 패키징된 NestJS 컨테이너에 있고,
// 이 Worker는 모든 요청을 그 컨테이너로 그대로 포워딩하는 얇은 라우터 역할만 한다.
// 고정된 이름(daon-backend)으로 항상 같은 컨테이너 인스턴스(들)을 가리키게 한다 - 요청마다
// 다른 인스턴스를 새로 띄우는 게 아니라, 지금처럼 "상시 구동 서버 하나"와 동일하게 동작해야
// 하기 때문이다(세션별로 다른 컨테이너가 필요한 시나리오가 아님).
import { Container } from '@cloudflare/containers';

export class DaonBackendContainer extends Container {
  defaultPort = 8080;
  // 트래픽이 없어도 바로 재우지 않는다 - 매 요청마다 콜드스타트가 나면 SMTP/DB 커넥션을 다시
  // 맺어야 해서 느려진다. 필요하면 나중에 조정.
  sleepAfter = '10m';
}

interface Env {
  DAON_BACKEND: DurableObjectNamespace<DaonBackendContainer>;
}

export default {
  async fetch(request: Request, env: Env) {
    const instance = env.DAON_BACKEND.getByName('daon-backend');
    return instance.fetch(request);
  },
} satisfies ExportedHandler<Env>;
