/**
 * 관광 콘텐츠 상세 화면.
 *
 * 검색 결과·축제 카드에서 넘어옵니다. 목록에서 이미 받은 요약(TourContent)을 함께
 * 받아서 제목·사진을 먼저 그려두고, 상세 응답이 도착하면 개요·이용안내를 채웁니다.
 * (상세를 기다리며 빈 화면을 보여주지 않기 위함입니다)
 */
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Chevron } from '../../components/icons/UiIcons';
import { SectionState } from '../../components/travel/TravelCards';
import PlaceDetailContent from '../../components/travel/PlaceDetailContent';
import { travelApi } from '../../api/travelApi';
import { useTravelQuery } from '../../travel/useTravelQuery';
import type { TourContent } from '../../types/travel';
import PhotoViewer, { type ViewerPhoto } from '../map/PhotoViewer';

type Props = {
  /** 목록에서 넘어온 요약 정보 — 상세를 기다리는 동안 먼저 보여줍니다 */
  spot: TourContent;
  onBack: () => void;
};

function SpotDetailScreen({ spot, onBack }: Props) {
  const insets = useSafeAreaInsets();

  const loader = useCallback(
    () => travelApi.getSpotDetail(spot.contentId, spot.contentTypeId),
    [spot.contentId, spot.contentTypeId],
  );
  const detail = useTravelQuery(`spot:${spot.contentId}`, loader);

  const heroUri = detail.data?.imageUrl ?? spot.imageUrl;
  const phone =
    spot.tel ??
    detail.data?.facts.find(fact => fact.label === '문의')?.value ??
    null;
  const [viewer, setViewer] = useState<{
    photos: ViewerPhoto[];
    index: number;
  } | null>(null);
  const openViewer = useCallback((urls: string[], index: number) => {
    setViewer({ photos: urls.map(uri => ({ uri })), index });
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PlaceDetailContent
          contentId={spot.contentId}
          contentTypeId={spot.contentTypeId}
          title={spot.title}
          categoryLabel={spot.typeLabel}
          address={spot.address}
          phone={phone}
          homepageUrl={detail.data?.homepageUrl ?? null}
          lat={spot.lat}
          lng={spot.lng}
          heroUrl={heroUri}
          images={detail.data?.images ?? []}
          facts={detail.data?.facts ?? []}
          overview={detail.data?.overview ?? null}
          onImagePress={openViewer}
          footer={
            <SectionState
              status={detail.status}
              error={detail.error}
              isEmpty={detail.status === 'ready' && detail.data === null}
              emptyText="이 장소의 상세 정보가 아직 없어요"
              onRetry={detail.reload}
              height={100}
            />
          }
        />
      </ScrollView>

      {/* 뒤로가기 — 사진 위에 겹칩니다 */}
      <Pressable
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="뒤로 가기"
      >
        <Chevron direction="left" color="#ffffff" size={22} />
      </Pressable>

      <PhotoViewer
        photos={viewer?.photos ?? []}
        initialIndex={viewer?.index ?? 0}
        visible={viewer !== null}
        onClose={() => setViewer(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {},
  backBtn: {
    position: 'absolute',
    left: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,24,35,0.5)',
  },
});

export default SpotDetailScreen;
