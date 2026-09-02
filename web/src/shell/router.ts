/**
 * 아주 작은 라우터.
 *
 * 앱의 화면 구조를 그대로 주소로 옮긴 것이 전부입니다.
 *
 *   /                          홈
 *   /search                    홈 > 검색
 *   /gallery                   홈 > 사진첩
 *   /spot/:타입/:콘텐츠ID       홈 > 장소 상세
 *   /city[/:도시ID]            홈 > 도시 선택
 *   /preference[/:도시ID]      홈 > 취향 프롬프트
 *   /map                       지도
 *   /assistant                 샛별이
 *   /record                    기록
 *   /record/new                기록 > 작성
 *   /record/:기록ID            기록 > 상세
 *   /record/:기록ID/edit       기록 > 수정
 *   /my                        마이
 *   /my/preference             마이 > 취향 편집
 *   /my/courses                마이 > 저장한 코스
 *   /account/delete            회원 탈퇴 (앱에 없는 웹 전용 페이지)
 *   /redirect                  카카오 로그인 복귀 지점 (앱에 없는 웹 전용 경로)
 *
 * 홈 탭의 안쪽 화면만 루트 바로 아래에 놓입니다(/search). 첫 칸이 탭 이름이면
 * 그 탭, 아니면 홈 탭으로 읽기 때문에, **홈 안쪽 화면 이름과 탭 이름은 겹치면
 * 안 됩니다.**
 *
 * ── 화면에 넘길 값을 어디에 두는가 ──
 * 주소에는 id 만 싣습니다. 장소 요약(TourSpot)이나 수정할 기록(TravelRecord)
 * 처럼 통째로 넘겨야 하는 값은 history.state 에 실어 둡니다. state 는 새로고침
 * 해도 그 히스토리 항목에 남아 있어서 뒤로/앞으로·새로고침이 모두 멀쩡합니다.
 * 남의 링크를 새 탭에 붙여 넣은 경우에만 state 가 비는데, 그때는 각 override 가
 * id 만으로 할 수 있는 만큼 하거나 한 단계 위 화면으로 물러납니다.
 *
 * 라이브러리를 쓰지 않은 이유는 경로가 이 정도뿐이고, 앱도 외부 네비게이션 없이
 * 직접 만든 스택·탭을 쓰고 있어 결을 맞추기 위해서입니다.
 */
import { useEffect, useState } from 'react';

/**
 * 하단 탭. 키는 앱의 TabKey(SoloTrav/src/navigation/tabs.ts)와 **같은 낱말**이어야
 * 합니다. overrides/useActiveTab.ts 가 이 이름으로 탭과 주소를 맞바꿉니다.
 */
export const TAB_ROUTES = {
  home: '/',
  map: '/map',
  assistant: '/assistant',
  record: '/record',
  my: '/my',
} as const;

export type TabKey = keyof typeof TAB_ROUTES;

/** 홈 탭은 루트에 있어서 첫 칸으로 구분되지 않습니다. */
const NON_HOME_TABS = ['map', 'assistant', 'record', 'my'] as const;

/**
 * 회원 탈퇴 — 구글 플레이 '계정 삭제' 정책에 제출하는 주소입니다.
 * 앱을 설치하지 않아도 접근할 수 있어야 하므로 인증 게이트 밖에 둡니다.
 */
export const DELETE_ACCOUNT_PATH = '/account/delete';

/**
 * 카카오 로그인 복귀 지점 — 서버가 로그인을 마친 뒤 1회용 티켓을 붙여 여기로
 * 돌려보냅니다. 서버의 기본 복귀 주소가 `/redirect` 라서 같은 이름을 씁니다.
 * (서버가 state 의 r 을 존중하든, 무시하고 기본값으로 보내든 같은 화면에 닿습니다)
 * 로그인하기 전에 열리는 화면이라 인증 게이트 밖에 둡니다.
 */
export const KAKAO_REDIRECT_PATH = '/redirect';

/** 앱에 없는, 웹에만 있는 화면 */
export type WebPage = 'deleteAccount' | 'kakaoRedirect';

/** 웹 전용 페이지 주소표 — 앱 화면보다 먼저 봅니다. */
const WEB_PAGES: Record<string, WebPage> = {
  [DELETE_ACCOUNT_PATH]: 'deleteAccount',
  [KAKAO_REDIRECT_PATH]: 'kakaoRedirect',
};

export type Location =
  /** 앱에 없는 웹 전용 페이지 */
  | { kind: 'page'; page: WebPage }
  /** 앱 화면 — 어느 탭의, 그 안쪽 어느 화면인지 */
  | { kind: 'tab'; tab: TabKey; segments: string[] };

/** '/record/abc/edit/' → ['record','abc','edit'] */
function toSegments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean).map(decodeURIComponent);
}

export function parseLocation(pathname: string): Location {
  const segments = toSegments(pathname);

  const page = WEB_PAGES[`/${segments.join('/')}`];
  if (page) {
    return { kind: 'page', page };
  }

  const first = segments[0] as (typeof NON_HOME_TABS)[number] | undefined;
  if (first && NON_HOME_TABS.includes(first)) {
    return { kind: 'tab', tab: first, segments: segments.slice(1) };
  }

  // 나머지는 전부 홈 탭 — 모르는 주소도 홈으로 떨어져서 빈 화면이 나오지 않습니다.
  return { kind: 'tab', tab: 'home', segments };
}

/** 경로 조각들을 주소로. 홈 탭 안쪽 화면은 루트 바로 아래에 놓입니다. */
export function toPath(tab: TabKey, segments: string[] = []): string {
  const parts = tab === 'home' ? segments : [tab, ...segments];
  const path = parts.map(encodeURIComponent).join('/');
  return path ? `/${path}` : '/';
}

/**
 * 주소가 바뀔 때 알리는 자체 이벤트.
 *
 * pushState 는 popstate 를 일으키지 않아서 직접 쏴야 합니다. 이때 popstate 를
 * 흉내 내면 안 됩니다 — shims/react-native.ts 의 BackHandler 가 popstate 를
 * "사용자가 뒤로 갔다" 로 알아듣고 열려 있던 시트를 닫아버립니다.
 */
export const NAVIGATE_EVENT = 'solotrav:navigate';

function emit(): void {
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

/** 현재 위치. 뒤로가기(popstate)와 navigate() 양쪽에 따라 바뀝니다. */
export function useLocation(): Location {
  const [location, setLocation] = useState<Location>(() =>
    parseLocation(window.location.pathname),
  );

  useEffect(() => {
    const sync = () => setLocation(parseLocation(window.location.pathname));
    window.addEventListener('popstate', sync);
    window.addEventListener(NAVIGATE_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(NAVIGATE_EVENT, sync);
    };
  }, []);

  return location;
}

/** 히스토리 항목에 실어둔 값 — 화면에 통째로 넘겨야 하는 것들 */
export function locationState<T>(): Partial<T> {
  const state = window.history.state;
  return state && typeof state === 'object' ? (state as Partial<T>) : {};
}

/**
 * 우리가 쌓은 히스토리 항목의 깊이.
 *
 * 화면의 '뒤로' 버튼은 브라우저 뒤로가기와 같아야 자연스럽습니다(앞으로 기록이
 * 남고, 항목이 늘어나지 않습니다). 그런데 남이 보내준 링크로 안쪽 화면에 바로
 * 들어온 사람에게는 돌아갈 항목이 없어서, 뒤로가기를 부르면 사이트 밖으로
 * 나가버립니다. 그래서 깊이를 세뒀다가 0이면 상위 화면으로 갈아치웁니다.
 */
const DEPTH_KEY = '__solotravDepth';

function currentDepth(): number {
  const state = window.history.state as Record<string, unknown> | null;
  const depth = state?.[DEPTH_KEY];
  return typeof depth === 'number' ? depth : 0;
}

function withDepth(state: unknown, depth: number): Record<string, unknown> {
  const base = state && typeof state === 'object' ? state : {};
  return { ...(base as Record<string, unknown>), [DEPTH_KEY]: depth };
}

/**
 * 새 주소로 이동합니다(히스토리 항목이 하나 쌓입니다).
 * @param state 주소에 담기 어려운 값 — 뒤로가기·새로고침에도 남습니다.
 */
export function navigate(to: string, state?: unknown): void {
  if (window.location.pathname === to) {
    return;
  }
  window.history.pushState(withDepth(state, currentDepth() + 1), '', to);
  emit();
}

/** 지금 항목을 갈아치웁니다(뒤로가기에 남기고 싶지 않은 이동). */
export function replace(to: string, state?: unknown): void {
  window.history.replaceState(withDepth(state, currentDepth()), '', to);
  emit();
}

/**
 * 한 단계 뒤로 — 앱의 pop() / 화면 '뒤로' 버튼에 해당합니다.
 * 돌아갈 항목이 없으면(링크로 바로 들어온 경우) fallback 으로 갈아치웁니다.
 */
export function goBack(fallback: string): void {
  if (currentDepth() > 0) {
    window.history.back();
    return;
  }
  replace(fallback);
}
