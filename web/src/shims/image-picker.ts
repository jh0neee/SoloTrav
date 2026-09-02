/**
 * react-native-image-picker 자리 채우기.
 *
 * 실제 사진 선택은 이 shim 이 아니라 웹 전용 구현이 통째로 대신합니다.
 *   → src/overrides/imagePicker.ts (vite.config.ts 의 moduleOverrides)
 *
 * 앱의 media/imagePicker.ts 가 이 패키지에서 **타입만** 가져다 쓰기 때문에
 * (컴파일하면 사라집니다) 여기서는 타입 모양만 맞춰 둡니다.
 */
export type Asset = {
  uri?: string;
  fileName?: string;
  type?: string;
  fileSize?: number;
  width?: number;
  height?: number;
};

export type ImageLibraryOptions = {
  mediaType: 'photo' | 'video' | 'mixed';
  selectionLimit?: number;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
};

export type ImagePickerResponse = {
  didCancel?: boolean;
  errorCode?: 'camera_unavailable' | 'permission' | 'others';
  errorMessage?: string;
  assets?: Asset[];
};

export async function launchImageLibrary(): Promise<ImagePickerResponse> {
  return { didCancel: true };
}

export async function launchCamera(): Promise<ImagePickerResponse> {
  return { didCancel: true };
}
