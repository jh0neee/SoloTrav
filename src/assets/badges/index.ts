import type { ImageSourcePropType } from 'react-native';
import type { BadgeImageKey } from '../../types/badge';

/** Metro가 번들에 포함할 수 있도록 로컬 이미지는 정적 require로 선언합니다. */
export const BADGE_IMAGES: Record<BadgeImageKey, ImageSourcePropType> = {
  '00': require('./00.png'),
  '01': require('./01.png'),
  '02': require('./02.png'),
  '03': require('./03.png'),
  '04': require('./04.png'),
  '05': require('./05.png'),
  '06': require('./06.png'),
  '07': require('./07.png'),
  '08': require('./08.png'),
  '09': require('./09.png'),
  '10': require('./10.png'),
  'cb_1': require('./cb_1.png'),
  'cb_2': require('./cb_2.png'),
  'cb_3': require('./cb_3.png'),
  'cb_4': require('./cb_4.png'),
  'cb_5': require('./cb_5.png'),
  'cb_6': require('./cb_6.png'),
  'cb_7': require('./cb_7.png'),
  'cb_8': require('./cb_8.png'),
  'cb_9': require('./cb_9.png'),
  'cb_10': require('./cb_10.png'),
  'cb_11': require('./cb_11.png'),
};
