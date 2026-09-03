/** 지도 관광지 상세 — 홈 상세 본문을 그대로 바텀시트 안에서 사용합니다. */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import BottomSheet from '../../components/BottomSheet';
import PlaceDetailContent, {
  type PlaceDetailFact,
} from '../../components/travel/PlaceDetailContent';
import { travelApi } from '../../api/travelApi';
import { galleryApi, type GalleryPhoto } from '../../api/galleryApi';
import { parseRegion } from '../../api/safetyApi';
import { colors } from '../../theme/colors';
import { TOUR_CATEGORY_LABEL, formatEventPeriod } from '../../types/tourPlace';
import type {
  MappableTourContent,
  TourContentDetail,
} from '../../types/travel';
import PhotoViewer, { type ViewerPhoto } from './PhotoViewer';
import { TAB_CONTENT_BOTTOM_GAP } from '../../navigation/layout';

type Props = {
  place: MappableTourContent | null;
  onClose: () => void;
};

function TourPlaceSheet({ place, onClose }: Props) {
  // 닫히는 애니메이션 동안 마지막 장소 내용이 비지 않게 유지합니다.
  const [shown, setShown] = useState<MappableTourContent | null>(place);
  useEffect(() => {
    if (place) setShown(place);
  }, [place]);

  return (
    <BottomSheet
      visible={place !== null}
      onClose={onClose}
      snapPoints={[0.52, 0.86]}
      contentPaddingHorizontal={0}
      contentBackgroundColor={colors.cream}
      overlayHandle
      showCloseButton={false}
      clipContent
      bottomContentInset={TAB_CONTENT_BOTTOM_GAP}
    >
      {shown ? <SheetBody place={shown} /> : null}
    </BottomSheet>
  );
}

function SheetBody({ place }: { place: MappableTourContent }) {
  const { detail, loading } = usePlaceDetail(place);
  const galleryPhotos = usePlaceGallery(place);

  const matchingGalleryUrls = useMemo(
    () =>
      galleryPhotos
        .filter(photo => matchesPlace(photo, place))
        .map(photo => photo.imageUrl),
    [galleryPhotos, place],
  );

  const images = useMemo(
    () =>
      Array.from(new Set([...(detail?.images ?? []), ...matchingGalleryUrls])),
    [detail?.images, matchingGalleryUrls],
  );

  const facts = useMemo<PlaceDetailFact[]>(() => {
    const period = formatEventPeriod(place);
    return [
      ...(period ? [{ label: '행사 기간', value: period }] : []),
      ...(detail?.facts ?? []),
    ];
  }, [detail, place]);

  const [viewer, setViewer] = useState<{
    photos: ViewerPhoto[];
    index: number;
  } | null>(null);

  const openViewer = useCallback((urls: string[], index: number) => {
    setViewer({ photos: urls.map(uri => ({ uri })), index });
  }, []);

  return (
    <>
      <PlaceDetailContent
        contentId={place.contentId}
        contentTypeId={place.contentTypeId}
        title={place.title}
        categoryLabel={TOUR_CATEGORY_LABEL[place.category]}
        address={place.address}
        phone={
          place.tel ??
          detail?.facts.find(fact => fact.label === '문의')?.value ??
          null
        }
        homepageUrl={detail?.homepageUrl ?? null}
        lat={place.lat}
        lng={place.lng}
        heroUrl={place.imageUrl}
        images={images}
        facts={facts}
        overview={detail?.overview ?? null}
        onImagePress={openViewer}
        bottomPadding={0}
        footer={
          loading ? (
            <ActivityIndicator
              color={colors.textSecondary}
              style={styles.spinner}
            />
          ) : null
        }
      />

      <PhotoViewer
        photos={viewer?.photos ?? []}
        initialIndex={viewer?.index ?? 0}
        visible={viewer !== null}
        onClose={() => setViewer(null)}
      />
    </>
  );
}

/** 시트가 열린 장소의 상세 정보를 받아옵니다. 장소가 바뀌면 이전 요청은 취소합니다. */
function usePlaceDetail(place: MappableTourContent) {
  const [detail, setDetail] = useState<TourContentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setDetail(null);
    setLoading(true);

    travelApi
      .getSpotDetail(place.contentId, place.contentTypeId, controller.signal)
      .then(result => {
        if (!controller.signal.aborted) setDetail(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setDetail(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [place.contentId, place.contentTypeId]);

  return { detail, loading };
}

/** 갤러리 중 실제 장소명이 겹치는 사진만 상세 사진 후보로 사용합니다. */
function usePlaceGallery(place: MappableTourContent) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const region = parseRegion(place.address);
  const keyword = region?.sigungu ?? region?.sido ?? '';

  useEffect(() => {
    if (!keyword) {
      setPhotos([]);
      return;
    }
    const controller = new AbortController();
    setPhotos([]);
    galleryApi
      .search(keyword, undefined, controller.signal)
      .then(result => {
        if (!controller.signal.aborted) setPhotos(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPhotos([]);
      });
    return () => controller.abort();
  }, [keyword]);

  return photos;
}

function matchesPlace(
  photo: GalleryPhoto,
  place: MappableTourContent,
): boolean {
  const title = photo.title.replace(/\s/g, '');
  const name = place.title.replace(/\s/g, '');
  return (
    title.length >= 2 &&
    name.length >= 2 &&
    (title.includes(name) || name.includes(title))
  );
}

const styles = StyleSheet.create({
  spinner: { marginVertical: 24 },
});

export default TourPlaceSheet;
