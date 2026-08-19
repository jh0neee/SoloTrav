/**
 * 기기 사진 선택 (react-native-image-picker 감싸기).
 *
 * 최상단에서 import 하지 않고 호출 시점에 require 하는 이유:
 * 새 아키텍처에서는 import 만으로 TurboModuleRegistry.getEnforcing('ImagePicker')
 * 이 돌아, 네이티브를 다시 빌드하기 전에는 이 모듈을 스치기만 해도 기록 화면
 * 전체가 뜨지 않습니다. 늦게 불러 실패를 이 파일 안에 가둬두면, 재빌드 전이라도
 * 기록 작성/수정은 사진만 빼고 그대로 됩니다.
 *
 * 타입만 쓰는 import 는 컴파일 후 사라지므로 런타임에 영향이 없습니다.
 */
import type {
  Asset,
  ImageLibraryOptions,
  ImagePickerResponse,
} from 'react-native-image-picker';
import type { UploadImage } from '../api/recordApi';

/**
 * 기록 한 건에 붙일 수 있는 사진 수.
 * 서버 제한을 스펙에서 못 봐서 화면에서 적당히 끊습니다.
 */
export const MAX_RECORD_IMAGES = 5;

type PickerModule = {
  launchImageLibrary: (
    options: ImageLibraryOptions,
  ) => Promise<ImagePickerResponse>;
};

let picker: PickerModule | null = null;

function loadPicker(): PickerModule {
  if (picker) {
    return picker;
  }
  try {
    picker = require('react-native-image-picker') as PickerModule;
  } catch {
    throw new Error(
      '사진 기능이 아직 앱에 들어있지 않습니다.\n앱을 다시 빌드한 뒤 시도해주세요.',
    );
  }
  return picker;
}

/** 'image/jpeg' → 'jpeg'. 알 수 없으면 'jpg' */
function extensionOf(mimeType: string): string {
  const suffix = mimeType.split('/')[1];
  return suffix && /^[a-z0-9]+$/i.test(suffix) ? suffix : 'jpg';
}

/**
 * 피커가 준 asset → 업로드용 { uri, name, type }.
 * uri 가 없으면 올릴 수 없으므로 버립니다.
 *
 * fileName 은 안드로이드에서 비어 오는 경우가 있어, 없으면 만들어 붙입니다.
 * 서버가 파일명으로 확장자를 판단할 수 있어 빈 이름으로 보내지 않습니다.
 */
function toUploadImage(asset: Asset, index: number): UploadImage | null {
  if (!asset.uri) {
    return null;
  }
  const type = asset.type ?? 'image/jpeg';
  const name =
    asset.fileName?.trim() ||
    `record-${Date.now()}-${index}.${extensionOf(type)}`;
  return { uri: asset.uri, name, type };
}

function messageFor(response: ImagePickerResponse): string {
  switch (response.errorCode) {
    case 'permission':
      return '사진 접근 권한이 필요합니다.\n설정에서 허용해주세요.';
    case 'camera_unavailable':
      return '카메라를 사용할 수 없습니다.';
    default:
      return response.errorMessage || '사진을 불러오지 못했습니다.';
  }
}

/**
 * 갤러리에서 사진을 고릅니다.
 *
 * - 취소하면 빈 배열 (에러가 아닙니다)
 * - 권한 거부·모듈 미포함 등은 사람이 읽을 수 있는 메시지로 던집니다
 *
 * @param limit 이번에 더 고를 수 있는 장수. 0 이하면 피커를 열지 않습니다.
 */
export async function pickRecordImages(
  limit: number,
): Promise<UploadImage[]> {
  if (limit <= 0) {
    return [];
  }

  const response = await loadPicker().launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: limit,
    // 원본 그대로 올리면 한 장에 수 MB 라 사내망에서도 느립니다.
    // 피드에 쓰기엔 이 정도로 충분합니다.
    quality: 0.8,
    maxWidth: 1600,
    maxHeight: 1600,
  });

  if (response.didCancel) {
    return [];
  }
  if (response.errorCode) {
    throw new Error(messageFor(response));
  }

  return (response.assets ?? [])
    .map(toUploadImage)
    .filter((image): image is UploadImage => image !== null)
    .slice(0, limit);
}
