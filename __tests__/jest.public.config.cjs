// 네이티브 런타임이 필요 없는 API·캐시 회귀 테스트.
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/publicRequestQueue.test.ts',
    '**/__tests__/regionTourLoader.test.ts',
    '**/__tests__/homePublicData.test.ts',
    '**/__tests__/mapSearch.test.ts',
    '**/__tests__/mapViewport.test.ts',
    '**/__tests__/mapSafetyAndRecord.test.ts',
  ],
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      {
        babelrc: false,
        configFile: false,
        presets: ['module:@react-native/babel-preset'],
      },
    ],
  },
};
