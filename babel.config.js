module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // .env 값을 `@env` 모듈로 주입합니다. (타입 선언: src/types/env.d.ts)
    // 값 변경 후에는 `npm start -- --reset-cache` 로 캐시를 비워야 반영됩니다.
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        allowUndefined: false, // .env 에 없는 키를 import 하면 빌드 시점에 실패
      },
    ],
  ],
};
