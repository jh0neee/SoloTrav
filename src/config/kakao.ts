/**
 * 카카오맵 설정.
 *
 * ⚠️ 실행 전 반드시 해야 할 2가지 (https://developers.kakao.com)
 *
 * 1) 내 애플리케이션 > 앱 키 > **JavaScript 키** 를 복사해 아래 KAKAO_JS_KEY 에 붙여넣기
 *
 * 2) 내 애플리케이션 > 플랫폼 > Web > 사이트 도메인에 아래 KAKAO_WEBVIEW_ORIGIN 값
 *    (`http://localhost`) 을 그대로 등록
 *    → WebView 가 보내는 Referer 를 카카오가 검사합니다. 이 등록을 빠뜨리면
 *      지도가 회색 빈 화면으로만 뜨고 에러 메시지도 거의 나오지 않습니다.
 *      "지도가 안 보인다" 의 대부분이 이 항목입니다.
 *
 * 참고: JavaScript 키는 도메인으로 사용처가 제한되는 공개용 키라 앱에 담기는 것이
 * 정상입니다. REST API 키·Admin 키는 절대 여기 넣지 마세요.
 *
 * 참고: 카카오 '로그인' 에 쓰는 네이티브 앱 키는 이 파일이 아니라 네이티브 설정에
 * 있습니다. (Android: android/gradle.properties 의 KAKAO_NATIVE_APP_KEY,
 * iOS: ios/SoloTravelMateMobile/Info.plist) JS 에서는 접근하지 않습니다.
 */
import { KAKAO_LOGIN_REST_API_KEY} from '@env';

export const KAKAO_JS_KEY =KAKAO_LOGIN_REST_API_KEY;

/** WebView 에 HTML 을 주입할 때 쓰는 baseUrl. 카카오 Web 플랫폼에 등록한 값과 같아야 합니다. */
export const KAKAO_WEBVIEW_ORIGIN = 'http://localhost';

/** 키를 아직 안 넣었는지 검사 — 안내 화면을 띄우는 데 씁니다. */
export const isKakaoKeyConfigured =
  KAKAO_JS_KEY.length > 0 && !KAKAO_JS_KEY.startsWith('YOUR_');
