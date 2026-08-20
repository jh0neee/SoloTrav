/**
 * 관광지 상세 바텀시트 — 지도 마커를 탭하면 열립니다.
 *
 * 목록 조회로 이미 알고 있는 값(이름·주소·사진·거리)을 먼저 그려서 시트가 즉시
 * 채워지게 하고, 상세 조회(개요·이용시간·휴무·주차)는 도착하는 대로 덧붙입니다.
 * 시트를 열자마자 빈 화면을 보여 주지 않기 위한 구성입니다.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BottomSheet from '../../components/BottomSheet';
import { colors } from '../../theme/colors';
import { tourApi } from '../../api/tourApi';
import { galleryApi, type GalleryPhoto } from '../../api/galleryApi';
import { parseRegion } from '../../api/safetyApi';
import PhotoViewer, { type ViewerPhoto } from './PhotoViewer';
import {
  TOUR_CATEGORY_COLOR,
  TOUR_CATEGORY_LABEL,
  formatEventPeriod,
  formatTourDistance,
  type TourPlace,
  type TourPlaceDetail,
} from '../../types/tourPlace';

type Props = {
  place: TourPlace | null;
  onClose: () => void;
};

function TourPlaceSheet({ place, onClose }: Props) {
  /**
   * 닫힐 때 place 는 즉시 null 이 되지만 시트는 아직 내려가는 중입니다.
   * 마지막 장소를 붙들고 있어야 애니메이션 도중 내용이 빈 채로 보이지 않습니다.
   */
  const [shown, setShown] = useState<TourPlace | null>(place);
  useEffect(() => {
    if (place) setShown(place);
  }, [place]);

  return (
    <BottomSheet
      visible={place !== null}
      onClose={onClose}
      snapPoints={[0.55, 0.92]}
      header={shown ? <SheetHeader place={shown} /> : null}>
      {shown ? <SheetBody place={shown} /> : null}
    </BottomSheet>
  );
}

/** 드래그 영역에 함께 들어가는 고정 헤더 */
function SheetHeader({ place }: { place: TourPlace }) {
  const distance = formatTourDistance(place.distance);

  return (
    <View style={styles.header}>
      <View style={styles.badgeRow}>
        <View
          style={[
            styles.badge,
            { backgroundColor: TOUR_CATEGORY_COLOR[place.category] },
          ]}>
          <Text style={styles.badgeText}>
            {TOUR_CATEGORY_LABEL[place.category]}
          </Text>
        </View>
        {distance ? <Text style={styles.distance}>{distance}</Text> : null}
      </View>
      <Text style={styles.title}>{place.title}</Text>
      {place.address ? (
        <Text style={styles.area} numberOfLines={2}>
          {place.address}
        </Text>
      ) : null}
    </View>
  );
}

function SheetBody({ place }: { place: TourPlace }) {
  const { detail, loading } = usePlaceDetail(place);
  const { photos: regionPhotos, regionName } = usePlaceGallery(place);

  const homepage = detail?.homepage ?? null;

  /**
   * 지역 사진 중 이 장소를 찍은 것 / 그 외 지역 풍경.
   *
   * 갤러리는 같은 장소를 수십 장씩 담고 있어서, 지역 풍경 쪽은 제목이 같은
   * 사진을 한 장만 남깁니다. 그래야 스트립에 같은 곳이 줄줄이 늘어서지 않습니다.
   */
  const { placePhotos, otherPhotos } = useMemo(() => {
    const mine: GalleryPhoto[] = [];
    const others: GalleryPhoto[] = [];
    const seenTitles = new Set<string>();

    regionPhotos.forEach(photo => {
      if (matchesPlace(photo, place)) {
        mine.push(photo);
        return;
      }
      if (seenTitles.has(photo.title)) {
        return;
      }
      seenTitles.add(photo.title);
      others.push(photo);
    });

    return { placePhotos: mine, otherPhotos: others };
  }, [regionPhotos, place]);

  /**
   * 상단 캐러셀은 **이 장소가 확실한 사진**만 씁니다.
   *  1) 목록 응답의 대표 이미지 — 시트가 열리자마자 바로 보입니다
   *  2) detailImage2 의 추가 이미지
   *  3) 갤러리에서 제목이 이 장소와 겹치는 사진
   * 같은 주소가 겹칠 수 있어 한 번 걸러 냅니다.
   */
  const photos = useMemo(() => {
    const urls = [
      ...(place.imageUrl ? [place.imageUrl] : []),
      ...(detail?.imageUrls ?? []),
      ...placePhotos.map(photo => photo.imageUrl),
    ];
    return Array.from(new Set(urls));
  }, [place.imageUrl, detail?.imageUrls, placePhotos]);

  const phone = place.tel ?? detail?.infoCenter ?? null;
  const period = formatEventPeriod(place);
  const credit = placePhotos.length > 0 ? placePhotos[0].photographer : null;

  /* ── 전체화면 사진 뷰어 ── */

  const [viewer, setViewer] = useState<{
    photos: ViewerPhoto[];
    index: number;
  } | null>(null);

  const openViewer = useCallback((list: ViewerPhoto[], index: number) => {
    setViewer({ photos: list, index });
  }, []);
  const closeViewer = useCallback(() => setViewer(null), []);

  /** 상단 캐러셀용 — 설명 없이 사진만 */
  const heroViewerPhotos = useMemo<ViewerPhoto[]>(
    () => photos.map(uri => ({ uri })),
    [photos],
  );

  /** 지역 사진용 — 어디를 찍은 사진인지 설명을 함께 넘깁니다 */
  const regionViewerPhotos = useMemo<ViewerPhoto[]>(
    () =>
      otherPhotos.map(photo => ({
        uri: photo.imageUrl,
        caption: photo.photographer
          ? `${photo.title} · 사진 ${photo.photographer}`
          : photo.title,
      })),
    [otherPhotos],
  );

  return (
    <>
      {photos.length === 1 ? (
        <Pressable
          onPress={() => openViewer(heroViewerPhotos, 0)}
          accessibilityRole="imagebutton"
          accessibilityLabel="사진 크게 보기">
          <Image
            source={{ uri: photos[0] }}
            style={styles.hero}
            resizeMode="cover"
          />
        </Pressable>
      ) : photos.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoRow}
          style={styles.photoStrip}>
          {photos.map((uri, i) => (
            <Pressable
              key={uri}
              onPress={() => openViewer(heroViewerPhotos, i)}
              accessibilityRole="imagebutton"
              accessibilityLabel={`사진 ${i + 1} 크게 보기`}>
              <Image
                source={{ uri }}
                style={styles.photo}
                resizeMode="cover"
              />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {credit ? (
        <Text style={styles.credit}>사진 · 한국관광공사 {credit}</Text>
      ) : null}

      {period ? (
        <View style={styles.periodBox}>
          <Text style={styles.periodLabel}>행사 기간</Text>
          <Text style={styles.periodValue}>{period}</Text>
        </View>
      ) : null}

      {/* 이용 정보 — 값이 있는 항목만 줄로 보여 줍니다. */}
      <View style={styles.infoBox}>
        <InfoRow label="이용 시간" value={detail?.useTime} />
        <InfoRow label="휴무일" value={detail?.restDate} />
        <InfoRow label="주차" value={detail?.parking} />
        <InfoRow label="문의" value={detail?.infoCenter} />
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.primaryButton, !phone && styles.buttonDisabled]}
          disabled={!phone}
          onPress={() => phone && Linking.openURL(`tel:${cleanPhone(phone)}`)}
          accessibilityRole="button"
          accessibilityLabel="전화 걸기">
          <Text style={styles.primaryButtonText}>
            {phone ? '전화하기' : '전화번호 없음'}
          </Text>
        </Pressable>
        {homepage ? (
          <Pressable
            style={styles.iconButton}
            onPress={() => Linking.openURL(homepage)}
            accessibilityRole="button"
            accessibilityLabel="홈페이지 열기">
            <Text style={styles.iconButtonText}>홈</Text>
          </Pressable>
        ) : null}
      </View>

      {detail?.overview ? (
        <View style={styles.overviewBox}>
          <Text style={styles.sectionTitle}>소개</Text>
          <ExpandableText text={detail.overview} />
        </View>
      ) : loading ? (
        <ActivityIndicator color={colors.textSecondary} style={styles.spinner} />
      ) : null}

      {/*
        이 지역 사진 — 장소 사진이 아니라 같은 시군구에서 찍힌 사진입니다.
        섞어서 보여 주면 이 장소의 모습으로 오해할 수 있어 제목으로 구분합니다.
      */}
      {otherPhotos.length > 0 ? (
        <View style={styles.regionBox}>
          <Text style={styles.sectionTitle}>{regionName}의 다른 풍경</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoRow}
            style={styles.photoStrip}>
            {otherPhotos.map((photo, i) => (
              <Pressable
                key={photo.id}
                style={styles.regionCard}
                onPress={() => openViewer(regionViewerPhotos, i)}
                accessibilityRole="imagebutton"
                accessibilityLabel={`${photo.title} 크게 보기`}>
                <Image
                  source={{ uri: photo.imageUrl }}
                  style={styles.regionPhoto}
                  resizeMode="cover"
                />
                <Text style={styles.regionCaption} numberOfLines={1}>
                  {photo.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {/* 블록의 마지막 줄이라 아래 여백을 빼서 시트 끝이 늘어지지 않게 합니다 */}
          <Text style={[styles.credit, styles.creditLast]}>
            사진 · 한국관광공사 관광사진갤러리
          </Text>
        </View>
      ) : null}

      {/*
        후기 영역은 여행 기록에 장소를 가리키는 키(contentId)가 생기면 붙습니다.
        지금은 기록 API 가 좌표·contentId 를 받지 않아 이 장소의 후기를 찾을 수 없습니다.
      */}

      <PhotoViewer
        photos={viewer?.photos ?? []}
        initialIndex={viewer?.index ?? 0}
        visible={viewer !== null}
        onClose={closeViewer}
      />
    </>
  );
}

/** 접힌 상태에서 보여 줄 줄 수 */
const COLLAPSED_LINES = 5;

/**
 * 길면 접고 '더보기'를 붙이는 본문.
 *
 * numberOfLines 를 건 Text 의 onTextLayout 은 잘린 뒤의 줄만 알려 주기 때문에
 * "원래 몇 줄인지"를 알 수 없습니다. 그래서 같은 폭·같은 글꼴로 투명한 Text 를
 * 한 번만 깔아 전체 줄 수를 재고, 재고 나면 그 Text 는 사라집니다.
 */
function ExpandableText({ text }: { text: string }) {
  const [lineCount, setLineCount] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const canExpand = lineCount !== null && lineCount > COLLAPSED_LINES;

  return (
    <View>
      <Text
        style={styles.overview}
        numberOfLines={expanded ? undefined : COLLAPSED_LINES}>
        {text}
      </Text>

      {/* 줄 수 측정용 — 자리를 차지하지 않게 절대배치 + 투명 */}
      {lineCount === null ? (
        <Text
          style={[styles.overview, styles.measure]}
          onTextLayout={event => setLineCount(event.nativeEvent.lines.length)}
          pointerEvents="none">
          {text}
        </Text>
      ) : null}

      {canExpand ? (
        <Pressable
          onPress={() => setExpanded(value => !value)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ expanded }}>
          <Text style={styles.moreText}>
            {expanded ? '접기' : '더보기'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** 값이 없으면 줄 자체를 그리지 않습니다(빈 항목이 늘어서면 지저분해집니다). */
function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) {
    return null;
  }
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

/** 시트가 열린 장소의 상세 정보를 받아옵니다. 장소가 바뀌면 이전 요청은 취소합니다. */
function usePlaceDetail(place: TourPlace) {
  const [detail, setDetail] = useState<TourPlaceDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setDetail(null); // 이전 장소의 내용이 잠깐 남아 보이지 않게 먼저 비웁니다.
    setLoading(true);

    tourApi
      .detail(place.id, place.contentTypeId, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        setDetail(result);
      })
      .catch(() => {
        // 상세가 실패해도 목록에서 온 정보로 시트는 이미 채워져 있습니다.
        if (!controller.signal.aborted) setDetail(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [place.id, place.contentTypeId]);

  return { detail, loading };
}

/**
 * 관광사진갤러리에서 이 장소가 속한 **지역**의 사진을 받아옵니다.
 *
 * 장소 이름으로 직접 찾지 않는 이유가 있습니다. 갤러리 검색은 단순 부분일치라
 *   - 이름이 그대로 걸리는 경우가 12곳 중 2곳뿐이고,
 *   - '석문'으로 찾으면 평창의 '효석문화마을'이 122건 걸립니다.
 * 반면 시군구명('단양군')으로 찾으면 결과가 전부 그 지역 사진이라 정확합니다.
 *
 * 그래서 지역 사진을 받아 두고, 그중 제목이 이 장소와 겹치는 것만 장소 사진으로
 * 올려 씁니다. 나머지는 '이 지역 사진'으로 따로 구분해 보여 줍니다.
 */
function usePlaceGallery(place: TourPlace) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);

  const region = parseRegion(place.address);
  // 시군구가 없는 곳(세종 등)은 시도명으로 찾습니다.
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
        if (controller.signal.aborted) return;
        setPhotos(result);
      })
      .catch(() => {
        // 사진은 보조 정보라 실패해도 조용히 넘어갑니다.
        if (!controller.signal.aborted) setPhotos([]);
      });

    return () => controller.abort();
  }, [keyword]);

  return { photos, regionName: keyword };
}

/** 갤러리 사진 제목이 이 장소를 가리키는지 — 양쪽 포함 관계로 봅니다. */
function matchesPlace(photo: GalleryPhoto, place: TourPlace): boolean {
  const title = photo.title.replace(/\s/g, '');
  const name = place.title.replace(/\s/g, '');
  if (title.length < 2 || name.length < 2) {
    return false;
  }
  return title.includes(name) || name.includes(title);
}

/** '매표 043-423-4235' 처럼 안내 문구가 섞여 있어 숫자와 하이픈만 남깁니다. */
function cleanPhone(value: string): string {
  const match = /[\d-]{7,}/.exec(value.replace(/\s/g, ''));
  return match ? match[0] : value;
}

/**
 * 좌우 여백. 본문(BottomSheet 의 bodyContent)과 헤더가 같은 값을 써야
 * 배지·제목이 소개 글과 한 줄로 맞습니다.
 */
const GUTTER = 20;

const styles = StyleSheet.create({
  // 헤더
  header: {
    paddingHorizontal: GUTTER,
    paddingTop: 4,
    paddingBottom: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    // 우측 상단 닫기 버튼(30px)과 겹치지 않도록 비워 둡니다.
    paddingRight: 36,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  distance: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  area: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },

  // 본문
  hero: {
    width: '100%',
    height: 176,
    borderRadius: 14,
    marginBottom: 20,
    backgroundColor: colors.bonusBg,
  },
  // 사진이 여러 장이면 가로 스트립으로 넘겨 봅니다.
  /**
   * 가로 사진 목록은 시트 좌우 여백 밖까지 흐르게 합니다.
   * 여백 안에 가두면 사진이 화면 끝에서 잘려 답답해 보입니다.
   * 대신 contentContainer 에 같은 크기의 안쪽 여백을 줘서
   * 첫 장·마지막 장은 본문과 같은 선에서 시작하고 끝납니다.
   */
  photoStrip: {
    marginHorizontal: -GUTTER,
    marginBottom: 12,
  },
  photoRow: {
    gap: 10,
    paddingHorizontal: GUTTER,
  },
  photo: {
    width: 232,
    height: 168,
    borderRadius: 14,
    backgroundColor: colors.bonusBg,
  },
  credit: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    marginBottom: 18,
  },
  creditLast: {
    marginBottom: 0,
  },

  // 축제 기간
  periodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.bonusBg,
    marginBottom: 18,
  },
  periodLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.bonusText,
  },
  periodValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  infoBox: {
    gap: 14,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoLabel: {
    width: 64,
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  primaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.inkText,
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  overviewBox: {
    marginBottom: 28,
  },

  // 이 지역 사진
  regionBox: {
    marginBottom: 28,
  },
  regionCard: {
    width: 150,
  },
  regionPhoto: {
    width: 150,
    height: 104,
    borderRadius: 12,
    backgroundColor: colors.bonusBg,
  },
  regionCaption: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  overview: {
    fontSize: 15,
    // 긴 소개 글이라 줄 간격을 넉넉히 둡니다(글자 크기의 약 1.65배).
    lineHeight: 25,
    color: colors.textPrimary,
  },
  /** 줄 수 측정 전용 — 눈에 보이지 않고 레이아웃도 밀지 않습니다. */
  measure: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    opacity: 0,
  },
  moreText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    color: colors.bonusText,
  },
  spinner: {
    marginVertical: 24,
  },
});

export default TourPlaceSheet;
