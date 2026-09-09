/**
 * 앱 접근권한 안내 정의 및 관리 모듈.
 *
 * 정보통신망 이용촉진 및 정보보호 등에 관한 법률 제22조의2(접근권한에 대한 동의) 및
 * 방송통신위원회 「스마트폰 앱 접근권한 개인정보보호 가이드라인」, 원스토어 앱 심사 기준 준수.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PERMISSION_GUIDE_STORAGE_KEY = '@solotrav:permission_guide_seen_v1';

export type PermissionItem = {
  key: string;
  name: string;
  type: 'required' | 'optional';
  icon: 'location' | 'camera' | 'photo' | 'bell';
  purpose: string;
  consequence?: string;
};

export const APP_PERMISSIONS: PermissionItem[] = [
  {
    key: 'location',
    name: '위치 정보',
    type: 'optional',
    icon: 'location',
    purpose: '현위치 기반 주변 안전시설(CCTV·비상벨·대피소 등) 조회, 지도 내 현위치 표시, 여행지 방문 인증',
    consequence: '동의하지 않아도 위치 기반 기능 외 AI 코스 추천, 여행지 탐색 등 기본 서비스는 정상적으로 이용하실 수 있습니다.',
  },
  {
    key: 'photo',
    name: '사진 / 저장공간',
    type: 'optional',
    icon: 'photo',
    purpose: '나만의 혼행 기록 및 여행지 후기 작성 시 사진 첨부',
    consequence: '동의하지 않아도 사진 첨부 외 여행 기록 작성 등 기본 서비스를 정상적으로 이용하실 수 있습니다.',
  },
];

export const PERMISSION_SETTINGS_INFO = {
  android: '스마트폰 설정 > 애플리케이션(앱) > 혼행등대 > 권한',
  ios: '스마트폰 설정 > 혼행등대 > 권한',
  notice:
    '선택 접근권한은 해당 기능을 사용하실 때 동의를 받으며, 허용하지 않아도 해당 기능 외 서비스는 정상적으로 이용하실 수 있습니다.',
  withdrawalNotice:
    '접근권한 동의 후에도 단말기 설정을 통해 언제든지 권한을 변경하거나 철회하실 수 있습니다.',
};

/** 앱 접근권한 사전 안내 확인 여부 조회 */
export async function hasSeenPermissionGuide(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(PERMISSION_GUIDE_STORAGE_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/** 앱 접근권한 사전 안내 확인 완료 처리 */
export async function setSeenPermissionGuide(): Promise<void> {
  try {
    await AsyncStorage.setItem(PERMISSION_GUIDE_STORAGE_KEY, 'true');
  } catch (error) {
    console.warn('[permissionGuide] 확인 상태 저장 실패:', error);
  }
}

