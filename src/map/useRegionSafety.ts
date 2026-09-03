/**
 * 지도 상단 안전 배지용 훅.
 *
 * 좌표 → 지역명 변환에 별도 지오코딩 API 를 쓰지 않습니다. 마커 목록이 이미
 * 전체 주소(addr1)를 들고 있어서, 가장 가까운 장소의 주소에서 시도·시군구를
 * 뽑아 쓰면 요청 한 번을 아낄 수 있습니다.
 *
 * 따라서 마커가 하나도 없는 지역(바다 위 등)에서는 배지가 뜨지 않습니다.
 */
import { useEffect, useState } from 'react';
import { parseRegion, safetyApi, type SafetyBadge } from '../api/safetyApi';
import type { MappableTourContent } from '../types/travel';

export function useRegionSafety(places: MappableTourContent[]) {
  const [badge, setBadge] = useState<SafetyBadge | null>(null);

  // 가장 가까운(=목록 첫 번째) 장소의 주소를 지역 판단 기준으로 삼습니다.
  const address = places.find(place => place.address)?.address ?? '';
  const region = address ? parseRegion(address) : null;
  const sido = region?.sido ?? '';
  const sigungu = region?.sigungu ?? '';

  useEffect(() => {
    if (!sido) {
      setBadge(null);
      return;
    }

    const controller = new AbortController();
    safetyApi
      .badge({ sido, sigungu: sigungu || null }, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        setBadge(result);
      })
      .catch(() => {
        // 배지는 보조 정보라 실패해도 조용히 숨깁니다.
        if (!controller.signal.aborted) setBadge(null);
      });

    return () => controller.abort();
  }, [sido, sigungu]);

  return badge;
}
