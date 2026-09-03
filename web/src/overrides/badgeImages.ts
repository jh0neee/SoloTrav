/**
 * 배지 이미지 — 웹 구현. 앱의 src/assets/badges/index.ts 를 대신합니다.
 * (교체 지점: vite.config.ts 의 moduleOverrides)
 *
 * 앱 쪽은 Metro가 번들에 포함할 수 있도록 `require('./00.png')` 정적 require를
 * 씁니다. 브라우저에는 require가 없어서(Uncaught ReferenceError: require is
 * not defined) 그대로 가져다 쓸 수 없고, Vite의 ES import로 다시 선언합니다.
 * Vite가 돌려주는 값은 URL 문자열이라, RN 쪽 타입과 맞추려고 {uri} 로 감쌉니다.
 */
import type { ImageSourcePropType } from 'react-native';
import type { BadgeImageKey } from '@solotrav/src/types/badge';

import img00 from '@solotrav/src/assets/badges/00.png';
import img01 from '@solotrav/src/assets/badges/01.png';
import img02 from '@solotrav/src/assets/badges/02.png';
import img03 from '@solotrav/src/assets/badges/03.png';
import img04 from '@solotrav/src/assets/badges/04.png';
import img05 from '@solotrav/src/assets/badges/05.png';
import img06 from '@solotrav/src/assets/badges/06.png';
import img07 from '@solotrav/src/assets/badges/07.png';
import img08 from '@solotrav/src/assets/badges/08.png';
import img09 from '@solotrav/src/assets/badges/09.png';
import img10 from '@solotrav/src/assets/badges/10.png';
import imgCb1 from '@solotrav/src/assets/badges/cb_1.png';
import imgCb2 from '@solotrav/src/assets/badges/cb_2.png';
import imgCb3 from '@solotrav/src/assets/badges/cb_3.png';
import imgCb4 from '@solotrav/src/assets/badges/cb_4.png';
import imgCb5 from '@solotrav/src/assets/badges/cb_5.png';
import imgCb6 from '@solotrav/src/assets/badges/cb_6.png';
import imgCb7 from '@solotrav/src/assets/badges/cb_7.png';
import imgCb8 from '@solotrav/src/assets/badges/cb_8.png';
import imgCb9 from '@solotrav/src/assets/badges/cb_9.png';
import imgCb10 from '@solotrav/src/assets/badges/cb_10.png';
import imgCb11 from '@solotrav/src/assets/badges/cb_11.png';

const uri = (src: string): ImageSourcePropType => ({ uri: src });

export const BADGE_IMAGES: Record<BadgeImageKey, ImageSourcePropType> = {
  '00': uri(img00),
  '01': uri(img01),
  '02': uri(img02),
  '03': uri(img03),
  '04': uri(img04),
  '05': uri(img05),
  '06': uri(img06),
  '07': uri(img07),
  '08': uri(img08),
  '09': uri(img09),
  '10': uri(img10),
  cb_1: uri(imgCb1),
  cb_2: uri(imgCb2),
  cb_3: uri(imgCb3),
  cb_4: uri(imgCb4),
  cb_5: uri(imgCb5),
  cb_6: uri(imgCb6),
  cb_7: uri(imgCb7),
  cb_8: uri(imgCb8),
  cb_9: uri(imgCb9),
  cb_10: uri(imgCb10),
  cb_11: uri(imgCb11),
};
