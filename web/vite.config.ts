/**
 * SoloTrav Web — Vite 설정.
 *
 * 이 웹 프로젝트는 화면 코드를 스스로 갖고 있지 않습니다.
 * 한 단계 위 안드로이드 앱(저장소 루트 `..`)의 src 를 **그대로 컴파일해서** 브라우저에
 * 올립니다. 그래서 앱을 고치면 웹도 같이 바뀌고, 두 벌을 관리할 일이 없습니다.
 *
 * 그게 가능하려면 세 가지를 갈아끼워야 합니다.
 *   1) alias      : 'react-native' → react-native-web, 네이티브 전용 모듈 → 웹 shim
 *   2) overrides  : 모듈 단위로 웹 전용 구현으로 통째 교체 (상대경로 import 도 잡힘)
 *   3) proxy      : API 서버가 CORS 를 안 열어줘서 dev 서버가 대신 중계
 */
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
/** 안드로이드 앱 루트 — 화면 코드의 원본이자 유일한 출처입니다. */
const appRoot = path.resolve(here, '..');
const shim = (file: string) => path.resolve(here, 'src/shims', file);

/**
 * 모듈 통째 교체 플러그인.
 *
 * alias 는 import 문자열을 보고 매칭하기 때문에, 앱 안에서
 * `import ... from '../../media/imagePicker'` 처럼 상대경로로 부르는 모듈은
 * 잡지 못합니다. 여기서는 먼저 정상적으로 경로를 해석한 뒤, 해석된 **파일 경로**가
 * 교체 대상이면 웹 전용 구현으로 바꿔치기합니다.
 */
function moduleOverrides(map: Record<string, string>): Plugin {
  const entries = Object.entries(map).map(([from, to]) => [
    from.replace(/\\/g, '/'),
    to,
  ]);
  return {
    name: 'solotrav-module-overrides',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const resolved = await this.resolve(source, importer, {
        ...options,
        skipSelf: true,
      });
      if (!resolved) {
        return null;
      }
      const id = resolved.id.replace(/\\/g, '/');
      const hit = entries.find(([from]) => id.endsWith(from));
      return hit ? hit[1] : null;
    },
  };
}

export default defineConfig(({ mode }) => {
  // 웹 전용 .env (web/.env) — 앱의 .env(저장소 루트) 와 별개입니다.
  const env = loadEnv(mode, here, 'VITE_');
  /** 프록시가 요청을 흘려보낼 실제 API 서버 */
  const target = env.VITE_API_PROXY_TARGET || 'https://mixed-light.kr';

  /**
   * 서버가 /auth/kakao/native 에서 user-agent 를 필수로 요구하는데,
   * 브라우저는 스크립트가 User-Agent 헤더를 바꾸는 걸 금지합니다(무시됨).
   * 그래서 프록시가 지나가는 길에 앱과 같은 형식으로 붙여줍니다.
   */
  const forwardUserAgent = (proxy: any) => {
    proxy.on('proxyReq', (proxyReq: any) => {
      proxyReq.setHeader('User-Agent', 'SoloTravelMate/0.0.1 (web 1)');
    });
  };

  /**
   * 개발 서버를 거치는 API 요청에 dev 플래그를 쿼리로 붙입니다.
   *
   * 앱(저장소 루트)의 apiClient 는 건드리지 않습니다. 앱 소스는 웹과 공용이라
   * 거기에 넣으면 안드로이드 빌드에도 같이 실려 나갑니다. 여기서 붙이면
   * 웹 dev 서버를 지나는 요청에만 적용됩니다(프로덕션 빌드는 프록시를 타지 않음).
   */
  const withDevFlag = (url: string) => {
    // 이미 붙어 있으면 그대로 둡니다(중복 파라미터 방지).
    if (/[?&]Tcs-Dev=/.test(url)) {
      return url;
    }
    return url + (url.includes('?') ? '&' : '?') + 'Tcs-Dev=ENABLED';
  };

  return {
    plugins: [
      react(),
      moduleOverrides({
        // 사진 선택: 네이티브 피커 → <input type="file">.
        // 업로드 형식까지 달라서(FormData 에 실제 File 이 들어가야 합니다)
        // shim 이 아니라 모듈 자체를 갈아끼웁니다.
        'SoloTrav/src/media/imagePicker.ts': path.resolve(
          here,
          'src/overrides/imagePicker.ts',
        ),
        // 로그인: 카카오 SDK 토큰 교환 → 서버 주도 OAuth.
        // 카카오 앱에 Client Secret 이 켜져 있어 브라우저는 code 를 토큰으로
        // 바꿀 수 없습니다(KOE010). 서버가 교환하고 세션까지 만들어 주므로
        // 로그인 흐름 자체가 앱과 달라져서 모듈을 통째로 갈아끼웁니다.
        'SoloTrav/src/auth/authService.ts': path.resolve(
          here,
          'src/overrides/authService.ts',
        ),
        /*
         * 화면 전환: 지역 상태 → 주소창.
         *
         * 앱은 어느 화면인지를 컴포넌트 안 useState 로 들고 있어서 웹에서는
         * 주소가 늘 그대로였습니다. 아래 네 모듈만 갈아끼우면 탭·스택이 전부
         * 주소를 따라 움직입니다 — 화면 코드(탭바·스택·마이)는 앱 것을 그대로
         * 쓰고, "지금 어느 화면인지" 를 어디서 읽는지만 바뀝니다.
         */
        'SoloTrav/src/navigation/useActiveTab.ts': path.resolve(
          here,
          'src/overrides/useActiveTab.ts',
        ),
        'SoloTrav/src/navigation/useHomeStack.ts': path.resolve(
          here,
          'src/overrides/useHomeStack.ts',
        ),
        'SoloTrav/src/navigation/useRecordRoute.ts': path.resolve(
          here,
          'src/overrides/useRecordRoute.ts',
        ),
        'SoloTrav/src/navigation/useMyView.ts': path.resolve(
          here,
          'src/overrides/useMyView.ts',
        ),
        // 배지 이미지: Metro 전용 정적 require → Vite ES import.
        // (브라우저에는 require 가 없어 그대로 쓰면 그 자리에서 죽습니다)
        'SoloTrav/src/assets/badges/index.ts': path.resolve(
          here,
          'src/overrides/badgeImages.ts',
        ),
      }),
    ],

    resolve: {
      // 아래 순서대로 앞에서부터 매칭됩니다. 구체적인 항목을 먼저 둡니다.
      alias: [
        { find: '@env', replacement: shim('env.ts') },
        {
          find: 'react-native-safe-area-context',
          replacement: shim('safe-area-context.tsx'),
        },
        { find: 'react-native-webview', replacement: shim('webview.tsx') },
        {
          find: 'react-native-image-picker',
          replacement: shim('image-picker.ts'),
        },
        {
          find: 'react-native-color-matrix-image-filters',
          replacement: shim('color-matrix.tsx'),
        },
        { find: 'react-native-svg', replacement: shim('svg.tsx') },
        {
          find: '@react-native-async-storage/async-storage',
          replacement: shim('async-storage.ts'),
        },
        {
          find: '@react-native-seoul/kakao-login',
          replacement: shim('kakao-login.ts'),
        },
        {
          find: '@react-native-community/geolocation',
          replacement: shim('geolocation.ts'),
        },
        { find: 'phosphor-react-native', replacement: shim('phosphor.ts') },
        // 'react-native' 는 'react-native-web' 등에는 매칭되지 않습니다
        // (정확히 일치하거나 'react-native/' 로 시작할 때만 잡힙니다).
        { find: 'react-native', replacement: shim('react-native.ts') },
        // 앱 소스를 짧게 부르고 싶을 때 쓰는 별칭 (웹 전용 코드에서만 사용)
        { find: '@app', replacement: path.resolve(appRoot, 'src') },
        // 앱 루트 — main.tsx 가 App.tsx 를 여기서 가져옵니다.
        { find: '@solotrav', replacement: appRoot },
      ],
      /*
       * 같은 라이브러리가 두 벌 들어가는 것을 막습니다.
       *
       * 앱 소스는 저장소 루트(../src) 에 있어서, 그 안의 `import 'react'` 는 node 규칙상
       * SoloTrav/node_modules/react 로 해석됩니다. 반면 이 프로젝트의 파일들은
       * SoloTrav/web/node_modules/react 를 봅니다. 그대로 두면 React 가 두 개
       * 번들되어, 훅 디스패처가 어긋나면서 화면 첫 렌더에서
       * "Cannot read properties of null (reading 'useState')" 로 죽습니다.
       *
       * dev 서버는 사전 번들 과정에서 우연히 한쪽으로 합쳐져 문제가 드러나지
       * 않다가 프로덕션 빌드에서만 터집니다. 반드시 필요합니다.
       */
      dedupe: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-native-web',
        'axios',
      ],

      // 앱 소스가 확장자 없이 import 하는 파일들을 찾기 위한 목록.
      // .web.tsx 를 앞에 둬서, 앱 쪽에 웹 전용 파일이 생기면 그쪽이 우선됩니다.
      extensions: [
        '.web.tsx',
        '.web.ts',
        '.web.jsx',
        '.web.js',
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.json',
      ],
    },

    define: {
      // RN 전역. 앱 곳곳의 개발용 로그가 이 값을 봅니다.
      __DEV__: JSON.stringify(mode !== 'production'),
      // RNW 가 참조하는 경우가 있어 함께 채워둡니다.
      'process.env.NODE_ENV': JSON.stringify(mode),
    },

    server: {
      /*
       * 5173 은 옆 프로젝트(Portfolio)가 쓰고 있어 비켜 갑니다.
       * strictPort 로 못 박아 두는 이유: 카카오 개발자 콘솔에 도메인과
       * Redirect URI 를 포트까지 포함해 등록하는데, 포트가 그때그때 밀리면
       * 로그인이 조용히 실패합니다.
       */
      port: 5180,
      strictPort: true,
      fs: {
        // web/ 밖(저장소 루트)의 앱 소스를 dev 서버가 읽을 수 있게 허용합니다.
        allow: [here, appRoot],
      },
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
          rewrite: withDevFlag,
          configure: forwardUserAgent,
        },
        // 서버가 이미지 경로를 '/uploads/a.jpg' 처럼 상대경로로 내려주는데,
        // 앱은 여기에 API 호스트를 붙여 씁니다. 웹에서는 그 호스트가
        // dev 서버 자신이므로 이 경로도 같이 중계해야 사진이 뜹니다.
        '/uploads': { target, changeOrigin: true, secure: false },
        '/files': { target, changeOrigin: true, secure: false },
        '/images': { target, changeOrigin: true, secure: false },
        '/static': { target, changeOrigin: true, secure: false },

        // 카카오 API — CORS 를 열어주지 않아 중계가 필요합니다.
        // (shims/kakao-login.ts 의 세션 해제가 이 경로를 씁니다. 토큰 교환은
        //  서버가 하므로 kauth 중계는 더 이상 필요하지 않습니다)
        '/kapi': {
          target: 'https://kapi.kakao.com',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/kapi/, ''),
        },
      },
    },

    optimizeDeps: {
      // 앱 소스는 node_modules 밖에 있어 사전 번들 대상이 아닙니다.
      // 여기 적힌 것들만 미리 묶어 dev 첫 로딩을 줄입니다.
      include: [
        'react',
        'react-dom',
        'react-native-web',
        'axios',
        // 아이콘이 3,000개 들어있는 배럴이라 미리 묶지 않으면 dev 첫 로딩이 깁니다.
        '@phosphor-icons/react',
      ],
    },

    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
