/**
 * react-native-svg 대체 — 브라우저에 있는 진짜 <svg> 를 그대로 씁니다.
 *
 * 그 패키지는 Fabric 코드젠 네이티브 컴포넌트(CircleNativeComponent 등)를
 * 배럴에서 한꺼번에 export 해서, 이 앱이 쓰지 않는 도형까지 딸려 들어와
 * `react-native/Libraries/...` 를 직접 import 하다 dev 서버 의존성
 * 최적화가 깨집니다(react-native 자체가 웹에서는 shim 하나로 통째로
 * 갈아끼워져 있어 그 안쪽 경로를 찾을 수 없습니다).
 *
 * 이 앱은 Svg/G/Path/Text 넷만 씁니다(components/travel/ChungbukMap.tsx).
 * 넷 다 DOM SVG 엘리먼트와 prop 이름이 그대로 같아서 얇은 래퍼로 충분합니다.
 */
import React from 'react';

export default function Svg(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} />;
}

export function G(props: React.SVGProps<SVGGElement>) {
  return <g {...props} />;
}

export function Path(props: React.SVGProps<SVGPathElement>) {
  return <path {...props} />;
}

export function Text(props: React.SVGProps<SVGTextElement>) {
  return <text {...props} />;
}
