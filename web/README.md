# SoloTrav Web

안드로이드 앱 **SoloTrav**(이 저장소 루트 `..`)를 브라우저에 그대로 띄우는 웹 클라이언트입니다.

화면 코드를 따로 갖고 있지 않습니다. 상위 앱의 `src/` 와 `App.tsx` 를 **그대로
컴파일해서** 씁니다. 앱을 고치면 웹도 같이 바뀌고, 두 벌을 맞춰줄 일이 없습니다.

앱과 **같은 저장소**에 들어 있습니다. 따로 클론할 것이 없고, 앱과 버전이 항상 같습니다.

```
SoloTrav/             안드로이드 앱 (React Native) — 화면 코드의 원본
├─ App.tsx
├─ src/               ← 웹이 이걸 그대로 씁니다 (복사본 없음)
└─ web/               이 프로젝트 (React + TS + Vite)
   ├─ src/shims/      네이티브 모듈 → 웹 구현
   ├─ src/overrides/  모듈 단위 웹 전용 교체
   └─ src/shell/      모바일 폭 프레임
```

> 앱과 웹은 `node_modules` 를 따로 씁니다. 앱 쪽에서 `npm install`, 웹 쪽(`web/`)
> 에서 또 `npm install` 을 한 번씩 해야 합니다. Metro 는 [metro.config.js](../metro.config.js)
> 의 blockList 로 `web/` 을 무시하니 안드로이드 빌드에는 영향이 없습니다.

---

## 시작하기

```bash
cd web
npm install
cp .env.example .env     # 값 확인 (카카오 키)
npm run dev              # http://localhost:5180
```

> 저장소 루트(`..`)에서 바로 띄우고 싶으면 `npm run web` (내부적으로 `web/` 의 dev 를
> 호출합니다). 안드로이드 쪽 `npm start` / `npm run android` 와는 서로 무관합니다.

| 스크립트            | 설명                                     |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | 개발 서버 (포트 **5180** 고정)           |
| `npm run build`     | `dist/` 로 프로덕션 빌드                 |
| `npm run preview`   | 빌드 결과 미리보기                       |
| `npm run typecheck` | 타입 검사 (빌드는 타입을 막지 않습니다)  |

포트를 5180 으로 못 박아 둔 이유는 두 가지입니다. 5173 은 옆 프로젝트(Portfolio)가
쓰고 있고, 카카오 개발자 콘솔에는 도메인을 **포트까지 포함해** 등록해야 합니다.

---

## ⚠️ 카카오 개발자 콘솔 설정 (지도·로그인 필수)

https://developers.kakao.com > 내 애플리케이션 에서 아래를 맞춰야 지도가 뜨고
로그인이 됩니다. **하나라도 빠지면 조용히 실패합니다.**

### 1) 로그인은 **서버**가 합니다 (프론트에 키가 필요 없습니다)

이 카카오 앱은 [보안 > Client Secret] 이 켜져 있습니다. 시크릿 없이 인가 코드를
토큰으로 바꾸면 카카오가 `invalid_client / KOE010` 으로 거절하는데, 시크릿은
브라우저가 안전하게 보관할 수 있는 값이 아닙니다. 그래서 **토큰 교환은 서버만**
할 수 있고, 카카오에 등록된 `redirect_uri` 도 서버 콜백입니다.

프론트는 `GET /auth/kakao/auth-url` 로 인가 URL 을 받아 팝업만 띄웁니다.
자세한 흐름은 [src/web/kakaoWebLogin.ts](src/web/kakaoWebLogin.ts) 맨 위 주석에
있습니다.

| 용도 | 필요한 키 | .env 항목 |
| --- | --- | --- |
| 지도 (dapi.kakao.com) | **JavaScript 키** | `VITE_KAKAO_JS_KEY` |
| 로그인 (OAuth) | 없음 — 서버가 REST API 키와 시크릿을 들고 있습니다 | – |

> 앱(저장소 루트의 `.env`)의 변수명이 `KAKAO_LOGIN_REST_API_KEY` 인데 담긴 값은
> 실제로는 JavaScript 키입니다(지도에서만 씁니다). 이름만 보고 옮겨 적지 마세요.

### 2) 콘솔에 등록할 값

| 콘솔 위치 | 등록할 값 |
| --- | --- |
| 앱 설정 > 플랫폼 > **Web** > 사이트 도메인 | `http://localhost:5180` (+ 운영 도메인) |
| 제품 설정 > 카카오 로그인 > **Redirect URI** | `https://mixed-light.kr/api/v1/auth/kakao/callback` |
| 제품 설정 > 카카오 로그인 > 보안 > **Client Secret** | **사용함** (서버만 보관) |

- Web 플랫폼 등록은 **지도(JS 키)** 때문에 필요합니다. 로그인과는 무관합니다.
- 앱(WebView)이 쓰는 `http://localhost` 는 지우지 말고 **함께** 두세요.
  포트가 붙은 주소는 카카오가 별개 도메인으로 봅니다.
- Redirect URI 는 서버 주소 하나면 됩니다. `localhost` 콜백은 등록하지 않습니다.

### 3) ⏳ 아직 백엔드 작업이 남아 있습니다

지금은 로그인이 서버에서 **성공한 뒤 팝업이 `mixed-light.kr/redirect` 에서
멈춥니다.** 그 페이지는 프론트와 출처가 달라 부모 창이 결과를 읽을 수 없습니다.
서버가 로그인 후 프론트 주소로 되돌려보내 주어야 화면이 로그인 상태로 넘어갑니다.

프론트 쪽 복귀 지점은 **`/redirect` 로 이미 만들어 두었습니다**
([src/web/KakaoRedirectPage.tsx](src/web/KakaoRedirectPage.tsx)). 서버 기본
복귀 주소와 같은 이름이라, 서버가 `state` 의 `r` 을 존중하든 무시하고 자기
기본값으로 보내든 **같은 도메인 안에서는 같은 화면**에 닿습니다. 티켓이 팝업으로
오면 부모 창에 넘기고 창을 닫고, 같은 창으로 오면 그 자리에서 세션으로 바꿔
원래 보던 화면으로 되돌립니다.

필요한 변경(콜백의 302 대상 + 티켓 교환 엔드포인트)은
[docs/kakao-web-login-backend-spec.md](docs/kakao-web-login-backend-spec.md) 에
정리해 두었습니다. 반영 전까지 웹 로그인은 '취소' 로 끝납니다.

## 어떻게 앱 코드가 브라우저에서 도는가

`vite.config.ts` 가 세 가지를 갈아끼웁니다.

### 1. alias — 모듈 바꿔치기

| 앱이 부르는 것                            | 웹에서 실제로 쓰는 것            |
| ----------------------------------------- | -------------------------------- |
| `react-native`                            | `react-native-web` + 부족분 shim |
| `react-native-safe-area-context`          | `src/shims/safe-area-context.tsx` |
| `react-native-webview`                    | `<iframe>` 래퍼                  |
| `@react-native-async-storage/async-storage` | `localStorage`                 |
| `@react-native-seoul/kakao-login`         | 세션 해제만 (로그인은 authService 교체) |
| `@react-native-community/geolocation`     | `navigator.geolocation`          |
| `phosphor-react-native`                   | `@phosphor-icons/react`          |
| `@env`                                    | `import.meta.env`                |

`react-native-web` 이 못 채우는 부분은 `src/shims/react-native.ts` 가 직접 구현합니다.

- **`Alert`** — RNW 것은 함수 본문이 비어 있습니다. `confirm`/`alert` 로 다시 만들었습니다.
- **`BackHandler`** — RNW 것은 콘솔 에러만 냅니다. **브라우저 뒤로가기 버튼**에
  연결해서, 웹에서도 화면 뒤로가기가 그대로 동작합니다.
- **`Linking.openSettings`** — 없습니다. 권한 바꾸는 방법을 안내로 대신합니다.
- **`PermissionsAndroid`** — 없습니다. 웹에선 호출되지 않지만 import 는 되어야 해 스텁을 둡니다.
- **`global`** — RNW 안쪽 코드가 리액트 네이티브의 전역 이름 `global` 을 그대로
  부르는 곳이 있습니다(`Animated` 의 애니메이션 정지 등). 브라우저에는 없는
  이름이라 `global is not defined` 로 터져서, `index.html` 이 앱보다 먼저
  `window.global = window` 한 줄로 만들어 둡니다.

### 2. overrides — 모듈 통째 교체

alias 는 import 문자열을 보고 매칭해서, 앱 안에서 상대경로(`../../media/imagePicker`)로
부르는 모듈은 잡지 못합니다. 그래서 **해석된 파일 경로**로 교체하는 플러그인을 씁니다.

현재 교체 대상은 둘입니다.

- `SoloTrav/src/media/imagePicker.ts` → `src/overrides/imagePicker.ts`

  네이티브는 `{ uri, name, type }` 이라는 가짜 파일 객체를 FormData 에 넣으면 RN 이
  알아서 올려주지만, 브라우저에는 그런 장치가 없어 `"[object Object]"` 만 전송됩니다.
  웹에서는 진짜 `File` 을 골라 담아야 해서 피커 대신 모듈째 바꿉니다.

- `SoloTrav/src/auth/authService.ts` → `src/overrides/authService.ts`

  앱은 카카오 SDK 가 준 **카카오 토큰**을 `POST /auth/kakao/native` 로 보내 서비스
  JWT 를 받습니다. 웹은 카카오 토큰을 만질 수 없고(위 KOE010), 대신 서버가 세션까지
  만들어 주므로 로그인이 두 단계가 아니라 한 단계입니다. 흐름 자체가 달라서
  로그인 유스케이스를 통째로 바꿉니다.

### 3. proxy — CORS 우회

API 서버(`mixed-light.kr`)는 CORS 헤더를 주지 않고 preflight(OPTIONS)에 404 를
돌려줍니다. 브라우저에서 직접 부를 수 없어 dev 서버가 중계합니다.

| 경로       | 대상                      |
| ---------- | ------------------------- |
| `/api`     | `https://mixed-light.kr`  |
| `/uploads` `/files` `/images` `/static` | 같은 서버 (이미지) |
| `/kapi`    | `https://kapi.kakao.com`  (로그아웃)  |

토큰 교환은 서버가 하므로 `kauth` 중계는 필요하지 않습니다.

프록시는 지나가는 길에 `User-Agent` 헤더도 붙여줍니다. 서버가 카카오 로그인에서
이 헤더를 필수로 요구하는데, 브라우저는 스크립트가 이 헤더를 바꾸는 걸 금지하기
때문입니다. (앱이 심어둔 값은 `src/shell/webBootstrap.ts` 가 떼어냅니다)

---

## 화면 주소 (라우팅)

앱의 화면 구조를 **그대로 주소로 옮겼습니다.** 탭도, 탭 안쪽 화면도 전부 주소가
있어서 새로고침·뒤로가기·링크 공유가 웹답게 동작합니다. 라우터는
[src/shell/router.ts](src/shell/router.ts) 에 직접 만들어 뒀습니다(앱도 외부
네비게이션을 쓰지 않아 결을 맞췄습니다).

| 주소 | 화면 | 로그인 |
| --- | --- | --- |
| `/` | 홈 | 필요 |
| `/search` · `/gallery` | 홈 > 검색 · 사진첩 | 필요 |
| `/spot/:타입/:콘텐츠ID` | 홈 > 장소 상세 | 필요 |
| `/city[/:도시ID]` · `/preference[/:도시ID]` | 홈 > 도시 선택 · 취향 | 필요 |
| `/map` · `/assistant` | 지도 · 샛별이 | 필요 |
| `/record` · `/record/new` · `/record/:기록ID[/edit]` | 기록 | 필요 |
| `/my` · `/my/preference` · `/my/courses` | 마이 | 필요 |
| `/account/delete` | **회원 탈퇴** (앱에 없는 웹 전용 페이지) | 안내는 누구나, 실행은 로그인 후 |
| `/redirect` | **로그인 복귀 지점** — 서버가 티켓을 붙여 돌려보내는 곳 | - |
| `/kakao-callback.html` | 예전 복귀 지점 — 서버가 아직 이 주소로 보낼 때를 위한 예비 정적 파일 | - |

로그인 게이트는 앱의 `RootNavigator` 가 그대로 담당합니다. 로그아웃 상태로
`/my` 를 열면 로그인 화면이 뜨고, 로그인하면 주소가 그대로라 곧장 그 화면으로
들어옵니다.

### 화면 코드는 앱 것을 그대로 씁니다

웹이 따로 만든 화면은 회원 탈퇴 페이지 하나뿐입니다. 나머지는 앱이 "지금 어느
화면인지" 를 들고 있던 훅 네 개만 주소창 기반으로 갈아끼운 것입니다.

| 앱 (상태) | 웹 (주소) |
| --- | --- |
| `navigation/useActiveTab.ts` | [src/overrides/useActiveTab.ts](src/overrides/useActiveTab.ts) |
| `navigation/useHomeStack.ts` | [src/overrides/useHomeStack.ts](src/overrides/useHomeStack.ts) |
| `navigation/useRecordRoute.ts` | [src/overrides/useRecordRoute.ts](src/overrides/useRecordRoute.ts) |
| `navigation/useMyView.ts` | [src/overrides/useMyView.ts](src/overrides/useMyView.ts) |

주소에는 id 만 싣고, 장소 요약이나 수정할 기록처럼 통째로 넘겨야 하는 값은
`history.state` 에 둡니다. 새로고침해도 남지만 **남의 링크를 새 탭에 붙여 넣으면
비어 있어서**, 장소 상세는 id 로 다시 조회하고 기록 수정 화면은 상세로 물러납니다.

### 회원 탈퇴 — 구글 플레이 '계정 삭제' 정책

플레이 콘솔 > 앱 콘텐츠 > **데이터 안전 > 계정 삭제 URL** 에 제출할 주소입니다.

```
https://<배포주소>/account/delete
```

정책이 요구하는 것을 이렇게 맞췄습니다.

| 요구사항 | 구현 |
| --- | --- |
| 앱 설치 없이 접근 가능 | 인증 게이트 밖의 독립 경로 |
| 삭제/보관 데이터를 **로그인 전에** 안내 | 안내 카드를 항상 먼저 표시 |
| 본인 확인 | 카카오 로그인 후에만 실행 버튼 활성화 |
| 실수 방지 | 체크박스 2개 + '탈퇴' 직접 입력 |
| 처리 결과 고지 | 접수 시각·영구 삭제 예정일 표시 |

상단 바의 '회원 탈퇴' 링크는 **로그아웃 상태에서만** 보입니다. 로그인한
사람에게는 앱의 마이 화면에 이미 탈퇴 메뉴가 있어 같은 길을 두 번 낼 이유가
없고, 로그인하지 않은 사람에게는 이 링크가 유일한 통로라 그때는 반드시
보여야 합니다.

호출하는 API 는 `DELETE /auth/me` 입니다
([src/account/accountApi.ts](src/account/accountApi.ts)). 즉시 삭제가 아니라
**탈퇴 예약**이라, 계정은 곧바로 사용 중지되고 원본 데이터는 90일 뒤 정기
작업에서 지워집니다. 안내 문구도 그 흐름에 맞춰 써 두었습니다.

> ⚠️ **앱에도 탈퇴 진입점이 필요합니다.** 플레이 정책은 웹 URL 과 **앱 내부 경로**
> 를 둘 다 요구합니다. 이 웹은 웹 URL 요건만 채웁니다. 앱(저장소 루트)의 마이
> 화면에 탈퇴 메뉴를 추가하는 작업이 별도로 남아 있습니다.

> 📮 문의처를 넣으려면 [src/account/DeleteAccountPage.tsx](src/account/DeleteAccountPage.tsx)
> 의 `SUPPORT_EMAIL` 에 주소를 적으면 페이지 하단에 문의 안내가 나타납니다.
> (비워두면 그 블록은 숨겨집니다)

---

## 배포할 때

`npm run build` 결과는 정적 파일이라 어디에나 올릴 수 있지만, **프록시가 없어집니다.**
dev 서버가 하던 중계를 배포 환경에서 누군가 대신 해야 합니다. 둘 중 하나를 고르세요.

1. **API 서버에 CORS 를 연다** — `Access-Control-Allow-Origin` 에 웹 주소를 추가하고
   `OPTIONS` 요청에 200 을 돌려주게 합니다. 그 뒤 `.env` 의 `VITE_API_BASE_URL` 을
   `https://mixed-light.kr/api` 로 바꿉니다.
2. **웹 서버에서 리버스 프록시** — Nginx/Vercel 등에서 `/api`, `/uploads`, `/kapi`
   를 `vite.config.ts` 의 proxy 와 같은 규칙으로 넘깁니다. 코드는 그대로 둡니다.

카카오 콘솔에는 배포 도메인을 **사이트 도메인**(지도 JS 키용)으로만 추가하면
됩니다. Redirect URI 는 서버 주소 하나뿐이라 그대로입니다.

배포 도메인은 백엔드의 **복귀 허용 목록**에도 추가되어야 합니다
([docs/kakao-web-login-backend-spec.md](docs/kakao-web-login-backend-spec.md) 4-(A)).

### SPA 히스토리 폴백 (필수)

`/account/delete` 도, `/record` 나 `/spot/12/126508` 도 실제 파일이 아니라
자바스크립트가 그리는 화면입니다. 서버가 "없는 경로면 index.html 을 주라" 는
규칙을 갖고 있어야 주소를 직접 입력하거나 새로고침해도 열립니다. 탈퇴 주소는
플레이에 제출하는 것이라 이게 안 되면 심사에서 막히고, 나머지 화면은 새로고침
할 때마다 404 가 납니다.

| 호스팅 | 설정 |
| --- | --- |
| Netlify / Cloudflare Pages | [public/_redirects](public/_redirects) 이미 포함 — 추가 작업 없음 |
| Vercel | `vercel.json` 에 `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` |
| Nginx | `location / { try_files $uri $uri/ /index.html; }` |
| `vite preview` / dev 서버 | 기본 동작 (설정 불필요) |

`npm run build` 후 `npm run preview` 로 `http://localhost:4173/account/delete` 가
바로 열리는지 확인해보면 배포 전에 점검이 됩니다.

---

## 알려진 차이

| 항목            | 앱 (Android)              | 웹                                        |
| --------------- | ------------------------- | ----------------------------------------- |
| 뒤로가기        | 하드웨어 버튼             | 브라우저 뒤로가기 버튼                    |
| 알림창          | 네이티브 다이얼로그       | 브라우저 기본 `alert`/`confirm`           |
| 사진 선택       | 갤러리 피커               | 파일 선택 창                              |
| 위치 권한       | 안드로이드 권한 다이얼로그 | 브라우저 권한 프롬프트                   |
| 카카오 로그인   | 카카오톡 앱 전환          | 팝업 + OAuth 인가 코드                    |
| 설정 화면 이동  | `Linking.openSettings()`  | 불가 — 바꾸는 방법을 안내                 |

콘솔에 뜨는 `"shadow*" style props are deprecated` 경고는 react-native-web 이
`shadowColor` 같은 RN 스타일을 `boxShadow` 로 옮기라고 알리는 것입니다. 그림자는
정상적으로 그려지므로 앱 코드를 고칠 필요는 없습니다.
