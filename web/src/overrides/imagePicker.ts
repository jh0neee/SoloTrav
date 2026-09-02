/**
 * 앱의 src/media/imagePicker.ts 를 웹에서 통째로 대신하는 구현.
 * (교체는 vite.config.ts 의 moduleOverrides 가 합니다)
 *
 * shim 이 아니라 모듈 자체를 갈아끼우는 이유:
 * 네이티브는 `{ uri, name, type }` 이라는 **가짜 파일 객체**를 FormData 에 담으면
 * RN 네트워킹 계층이 알아서 파일로 만들어 올려줍니다. 브라우저에는 그런 장치가
 * 없어서 같은 객체를 넣으면 "[object Object]" 라는 글자만 전송됩니다.
 * 그래서 웹에서는 진짜 File 을 골라 담아야 하고, 이건 피커만 바꿔서는 안 되고
 * "무엇을 돌려주느냐" 까지 바뀌는 일이라 모듈 단위로 교체합니다.
 *
 * 돌려주는 값은 실제 File 이면서 앱이 기대하는 uri/name/type 도 함께 갖습니다.
 *   - FormData.append('images', file) → 정상적인 multipart 업로드
 *   - <Image source={{ uri }}>        → blob URL 로 미리보기
 */
import type { UploadImage } from '@app/api/recordApi';

/** 기록 한 건에 붙일 수 있는 사진 수 — 앱 원본과 같은 값입니다. */
export const MAX_RECORD_IMAGES = 5;

/**
 * File 에 uri 를 얹은 값.
 * File 은 이미 name/type 을 갖고 있어서 uri 만 더하면 UploadImage 모양이 됩니다.
 */
type WebUploadImage = File & UploadImage;

/** 브라우저 파일 선택 창을 열고 고른 파일들을 돌려줍니다. 취소하면 빈 배열. */
function openFileDialog(limit: number): Promise<File[]> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = limit > 1;
    // 화면에 보이면 안 되지만 일부 브라우저는 문서에 붙어 있어야 동작합니다.
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);

    let settled = false;
    const finish = (files: File[]) => {
      if (settled) {
        return;
      }
      settled = true;
      input.remove();
      resolve(files);
    };

    input.addEventListener('change', () => {
      finish([...(input.files ?? [])].slice(0, limit));
    });

    /**
     * 취소는 이벤트가 따로 없는 브라우저가 많습니다(cancel 이벤트는 최신 브라우저만).
     * 창이 닫히면 페이지로 포커스가 돌아오는 걸 이용해 뒤늦게 정리합니다.
     */
    input.addEventListener('cancel', () => finish([]));
    window.addEventListener(
      'focus',
      () => {
        // change 이벤트가 focus 보다 늦게 오는 경우가 있어 한 박자 기다립니다.
        window.setTimeout(() => finish([]), 500);
      },
      { once: true },
    );

    input.click();
  });
}

/** File → 업로드용 값. blob URL 을 붙여 미리보기까지 되게 합니다. */
function toUploadImage(file: File): WebUploadImage {
  const uploadable = file as WebUploadImage;
  // File 의 name/type 은 읽기 전용이라 그대로 쓰고, uri 만 얹습니다.
  Object.defineProperty(uploadable, 'uri', {
    value: URL.createObjectURL(file),
    enumerable: true,
    configurable: true,
  });
  return uploadable;
}

/**
 * 사진 고르기.
 *
 * @param limit 이번에 더 고를 수 있는 장수. 0 이하면 창을 열지 않습니다.
 */
export async function pickRecordImages(limit: number): Promise<UploadImage[]> {
  if (limit <= 0) {
    return [];
  }
  const files = await openFileDialog(limit);
  return files
    .filter(file => file.type.startsWith('image/'))
    .map(toUploadImage);
}
