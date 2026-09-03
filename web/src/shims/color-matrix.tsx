/**
 * react-native-color-matrix-image-filters 대체.
 *
 * 그 패키지는 Fabric 코드젠 네이티브 컴포넌트라 `react-native/Libraries/...`
 * 안쪽 파일을 직접 import 합니다. react-native 자체가 웹에서는 shim 하나로
 * 통째로 갈아끼워져 있어서(react-native.ts) 저 안쪽 경로는 찾을 수 없고,
 * 개발 서버 의존성 최적화가 그대로 죽습니다.
 *
 * 마이 화면(배지 흑백 처리)은 Grayscale 하나만 쓰므로, 그 하나만 CSS
 * grayscale 필터로 다시 만들면 충분합니다.
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native-web';

type Props = {
  amount?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function Grayscale({ amount = 1, style, children }: Props) {
  return (
    <View style={[style, { filter: `grayscale(${amount})` } as ViewStyle]}>
      {children}
    </View>
  );
}
