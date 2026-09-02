# 카카오 웹 로그인 — 백엔드 요청 사항

작성 2026-09-02 · 대상 `https://mixed-light.kr` (`/api/v1`)

**요약: 콜백이 로그인 후 프론트 주소로 돌려보내 주기만 하면 됩니다.**
카카오 연동 자체는 이미 정상 동작합니다.

---

## 1. 어디까지 되고 있나

프론트를 서버 주도 OAuth 로 바꾼 뒤, 카카오 토큰 발급은 **성공합니다.**

- 예전 에러 `invalid_client / KOE010` 은 사라졌습니다.
  (원인은 Client Secret 이었습니다 — 시크릿은 서버만 가질 수 있으므로 브라우저가
  직접 `POST /oauth/token` 을 호출하던 옛 방식은 구조적으로 불가능했습니다.
  지적해 주신 대로 `redirect_uri` 는 백엔드 콜백이 맞습니다.)
- 지금 흐름: 프론트가 팝업으로 `auth-url` 을 열고 → 카카오 → **서버 콜백** →
  서버가 교환 성공 → 프론트 `/redirect` 로 302 (`#ticket=…`) →
  `POST /auth/kakao/ticket/exchange` 로 세션 교환.
- 프론트에는 **복귀 페이지가 이미 준비되어 있습니다** — `/redirect`
  (`web/src/web/KakaoRedirectPage.tsx`). 서버 기본 복귀 주소와 같은
  이름을 일부러 골랐습니다. 서버가 `state` 의 `r` 을 존중하든, 무시하고 기본값
  으로 보내든 **같은 도메인 안에서는 같은 화면**에 닿게 하기 위해서입니다.
  (도메인이 다르면 여전히 서버 페이지에 멈춥니다 — 아래 4번이 그래서 필요합니다)

## 2. 그래서 막히는 지점

팝업이 `mixed-light.kr/redirect` 에 **착륙한 채로 멈춥니다.**

프론트는 `localhost:5180`(운영은 웹 도메인)이라 팝업과 **출처가 다릅니다.**
동일 출처 정책상 부모 창은 그 페이지의 내용도, 주소도, 쿠키도 읽을 수 없습니다.
그래서 로그인은 서버에서 끝났는데 앱 화면은 계속 대기 상태로 남습니다.

브라우저 보안 정책이라 프론트에서 우회할 방법이 없습니다.
**서버가 프론트 주소로 되돌려 보내주어야 합니다.**

## 3. 프론트가 이미 보내고 있는 것 — `state`

서버의 `auth-url` 은 `redirectUri`, `returnUrl`, `redirect`, `callbackUrl`,
`next` … 어떤 파라미터를 넘겨도 무시합니다(2026-09-02 확인). 카카오를 거쳐 서버
콜백까지 그대로 돌아오는 값은 **`state` 하나뿐**입니다.

그래서 프론트는 돌아올 주소를 `state` 안에 담아 보냅니다.

```
state = base64url(JSON.stringify({ n: "<난수>", r: "<돌아올 프론트 주소>", p: "<로그인을 시작한 화면>" }))
```

디코드하면 이렇습니다.

```json
{ "n": "k3f9a2b1", "r": "http://localhost:5180/redirect", "p": "/account/delete" }
```

- `n` — 로그인 시도 식별용 난수. 서버는 해석할 필요 없이 그대로 돌려주면 됩니다.
- `r` — 로그인이 끝난 뒤 사용자를 돌려보낼 주소.
- `p` — 프론트가 자기 화면을 되찾는 데 쓰는 값. 서버는 볼 필요가 없습니다.

> 파라미터 쪽이 편하시면 `?redirectUri=` 로도 같은 값을 함께 보내고 있으니
> 어느 쪽을 읽으셔도 됩니다.

## 4. 요청 드리는 변경 (2가지)

### (A) `GET /auth/kakao/callback` — 프론트로 302

`state` 를 디코드해 `r` 이 있고 **허용 목록에 있으면** 그 주소로 보내 주세요.

성공:

```
302 Found
Location: http://localhost:5180/redirect#ticket=<1회용 티켓>&state=<받은 state 그대로>
```

실패:

```
302 Found
Location: http://localhost:5180/redirect#error=<코드>&error_description=<메시지>&state=<받은 state 그대로>
```

- `state` 는 **받은 문자열 그대로** 돌려주세요. 프론트가 자기가 만든 값과
  대조해 다른 탭·다른 시도의 응답을 걸러냅니다.
- **`#`(해시)로 붙여 주세요.** 해시는 HTTP 요청에 실려 나가지 않아 접근 로그와
  `Referer` 에 티켓이 남지 않습니다. (`?` 로 보내도 프론트는 받습니다)
- 서비스 JWT 를 URL 에 직접 싣지 말고 티켓만 실어 주세요(아래 B 로 교환).

**⚠️ 허용 목록(allowlist)은 반드시 필요합니다.** `r` 은 클라이언트가 만든
값이라 그대로 믿고 리다이렉트하면 오픈 리다이렉트 취약점이 됩니다. origin
기준으로 대조해 주세요.

- `http://localhost:5180` (개발)
- 운영 웹 도메인

**기존 동작은 그대로 두어야 합니다.** `state` 에 `r` 이 없거나 허용 목록 밖이면
지금처럼 `https://mixed-light.kr/redirect` 로 보내 주세요. 회원탈퇴 API 테스트
페이지는 그대로 쓸 수 있어야 하고, 기존 호출자도 깨지면 안 됩니다.

> 프론트의 `/redirect` 와 서버의 `/redirect` 는 **경로 이름만 같고 출처가
> 다릅니다**(개발 중 프론트는 `http://localhost:5180`). 브라우저는 출처로
> 판단하므로, `r` 을 읽어 그 origin 으로 보내주셔야 부모 창이 결과를 받습니다.

### (B) `POST /auth/kakao/ticket/exchange` — 티켓을 세션으로

> ✅ **반영됨 (2026-09-02).** 서버가 연 주소는 `/auth/kakao/ticket/exchange`
> 입니다(처음 요청드린 `/auth/kakao/ticket` 이 아닙니다). 프론트도 이 주소로
> 맞췄습니다 — `src/web/kakaoWebLogin.ts` 의 `TICKET_ENDPOINT`.

```
POST /api/v1/auth/kakao/ticket/exchange
Content-Type: application/json

{ "ticket": "…" }
```

응답은 앱이 쓰는 `POST /auth/kakao/native` 와 **같은 모양**이면 됩니다.

```json
{
  "payload": {
    "user": { "id": 1, "nickname": "…", "profileImageUrl": "…" },
    "tokens": { "accessToken": "…", "refreshToken": "…" }
  },
  "ok": true, "code": "OK", "status": 200
}
```

- 티켓은 **1회용**, TTL 60~120초, 사용 즉시 폐기.
- 추측 불가능한 난수(≥128bit).
- 만료·재사용·없는 티켓은 401.

> 웹은 쿠키 세션이 아니라 앱과 같은 **Bearer 토큰**으로 돕니다
> (`Authorization: Bearer …`). 그래서 `/redirect` 페이지처럼 쿠키에 기대는
> 방식으로는 앱 화면이 로그인 상태를 알 수 없습니다.

### (B') 엔드포인트를 새로 만들기 어렵다면 — 토큰 직접 전달

(B) 대신 **콜백 한 곳만** 고치는 방법입니다. 티켓 없이 서비스 토큰을 그대로
프래그먼트에 실어 주세요.

```
302 Found
Location: http://localhost:5180/redirect#accessToken=…&refreshToken=…&state=<받은 state 그대로>
```

`access_token` / `refresh_token` (snake_case) 로 보내셔도 프론트가 받습니다.
사용자 정보는 프론트가 `GET /users/me` 로 따로 조회하므로 함께 보낼 필요가 없습니다.

**프론트는 (B) 와 (B') 를 모두 받도록 이미 만들어져 있습니다.** 편한 쪽을
고르시면 되고, 프론트 수정은 필요 없습니다.

다만 (B) 를 권합니다. 프래그먼트는 서버로 전송되지 않지만 브라우저 주소창·기록·
확장 프로그램에는 노출되고, 만료가 긴 refresh token 이 거기 실리기 때문입니다.
(프론트는 받은 즉시 `history.replaceState` 로 주소에서 지웁니다)

## 5. 이렇게 하면 화면이 이렇게 됩니다

| 로그인을 시작한 곳 | 지금 | 변경 후 |
| --- | --- | --- |
| 앱 홈 (로그인 버튼) | `mixed-light.kr/redirect` 에서 멈춤 | 팝업이 닫히고 **홈 화면** |
| `/account/delete` (회원 탈퇴) | `mixed-light.kr/redirect` 에서 멈춤 | 팝업이 닫히고 **탈퇴 페이지**(실행 버튼 활성화) |
| 서버 `/redirect` 직접 진입 | 그대로 | 그대로 (회원탈퇴 API 테스트용) |
| 프론트 `/redirect` 직접 진입 | 홈으로 떨어짐 | "로그인 정보가 없습니다" 안내 + 홈 링크 |

팝업 방식이라 **부모 창은 원래 있던 페이지에 그대로 있습니다.** 서버가 티켓만
돌려주면 "어디로 갈지" 는 프론트가 알아서 맞춥니다.

## 6. 프론트 구현 위치

| 파일 | 역할 |
| --- | --- |
| `web/src/web/kakaoWebLogin.ts` | 팝업 → auth-url → 티켓 수신 → 교환 |
| `web/src/overrides/authService.ts` | 웹 로그인 흐름으로 모듈 교체 |
| `web/src/web/KakaoRedirectPage.tsx` | **복귀 페이지 `/redirect`** — 티켓을 부모 창에 전달(팝업)하거나 그 자리에서 세션으로 교환(같은 창) |
| `web/public/kakao-callback.html` | 예전 복귀 지점 — 서버가 아직 이 주소로 보낼 때를 위한 예비 |

## 7. 카카오 개발자 콘솔 — 바꿀 것 없음

- Redirect URI: `https://mixed-light.kr/api/v1/auth/kakao/callback` (그대로)
- 보안 > Client Secret: **사용함** 그대로 (서버만 보관)
- 플랫폼 > Web > 사이트 도메인: `http://localhost:5180` + 운영 도메인
  — 로그인이 아니라 **카카오맵 JS 키**용입니다.

## 8. 검증 순서

1. `state` 를 실어 인가 URL 을 받는다
   ```bash
   S=$(printf '{"n":"t1","r":"http://localhost:5180/redirect"}' | base64 | tr '+/' '-_' | tr -d '=')
   curl -s "https://mixed-light.kr/api/v1/auth/kakao/auth-url?state=$S"
   ```
   → 인가 URL 에 `state=$S` 가 포함되는지
2. 브라우저에서 로그인 → 팝업이 `localhost:5180/redirect#ticket=…` 로
   돌아오고, "로그인이 확인되었습니다" 를 스치듯 보여준 뒤 스스로 닫히는지
3. `POST /auth/kakao/ticket` → `{user, tokens}` 가 오는지 / 같은 티켓 재사용 시 401 인지
4. 허용 목록 밖 `r` (예: `https://evil.example`) → `/redirect` 로 가거나 400 인지
5. `state` 없이 호출한 기존 흐름이 그대로 `/redirect` 로 가는지 (회귀 확인)
