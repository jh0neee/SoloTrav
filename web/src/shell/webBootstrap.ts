/**
 * 웹에서만 필요한 자잘한 뒷정리. App 을 그리기 전에 한 번 부릅니다.
 *
 * 앱 소스를 고치지 않고 웹의 제약을 비켜 가기 위한 자리입니다.
 * 여기서 하는 일이 늘어난다면 그건 shim 으로 옮겨야 한다는 신호입니다.
 */
import { apiClient } from '@app/api/client';
import { plainClient } from '@app/api/http';

/**
 * axios 인스턴스에서 User-Agent 기본 헤더를 뗍니다.
 *
 * 앱은 서버가 요구하는 user-agent 를 직접 실어 보내는데, 브라우저는 스크립트가
 * 이 헤더를 건드리는 걸 금지합니다. 값은 무시되면서 요청마다 콘솔에
 * "Refused to set unsafe header" 에러만 쌓입니다.
 *
 * 그래서 웹에서는 빼고, 대신 dev 프록시가 지나가는 길에 같은 값을 붙여줍니다.
 * (vite.config.ts 의 forwardUserAgent)
 */
function dropForbiddenHeaders() {
  const instances = [apiClient, plainClient];
  for (const instance of instances) {
    const headers = instance.defaults.headers as Record<string, unknown> & {
      common?: Record<string, unknown>;
    };
    delete headers['User-Agent'];
    delete headers['user-agent'];
    delete headers.common?.['User-Agent'];
    delete headers.common?.['user-agent'];
  }
}

export function bootstrapWeb(): void {
  dropForbiddenHeaders();
}
