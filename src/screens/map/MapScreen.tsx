/**
 * 지도 화면 — 카카오맵 위에 검색바·필터칩·현위치·SOS·장소 바텀시트를 얹습니다.
 * 지도는 절대배치로 화면을 꽉 채우고, 나머지 UI 는 그 위에 떠 있습니다.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BedIcon,
  Chevron,
  FestivalIcon,
  FoodIcon,
  MountainIcon,
  MuseumIcon,
  MyLocationIcon,
  RouteIcon,
  SearchIcon,
  ShoppingIcon,
  SportsIcon,
} from '../../components/icons/UiIcons';
import {
  LampPendantIcon,
  ShieldCheckIcon,
  SirenIcon,
  ToiletIcon,
} from 'phosphor-react-native';
import { colors } from '../../theme/colors';
import KakaoMap, { type KakaoMapHandle } from './KakaoMap';
import MapSearchOverlay from './MapSearchOverlay';
import TourPlaceSheet from './TourPlaceSheet';
import PoiCard from './PoiCard';
import SosScreen from '../sos/SosScreen';
import { useCurrentLocation } from '../../location/useCurrentLocation';
import {
  hasViewportChanged,
  useNearbyPlaces,
  type Coords,
} from '../../map/useNearbyPlaces';
import { useRegionSafety } from '../../map/useRegionSafety';
import {
  FESTIVAL_RANGES,
  FESTIVAL_RANGE_LABEL,
  useNearbyFestivals,
  type FestivalRange,
} from '../../map/useNearbyFestivals';
import { TOUR_CATEGORY_LABEL, type TourCategory } from '../../types/tourPlace';
import type { MappableTourContent } from '../../types/travel';
import type { SearchPoi } from './searchTypes';
import { type SafetyPlaceType } from '../../api/safetyPlaceApi';
import { useSafetyPlaces, type MapBounds } from '../../map/useSafetyPlaces';
import type { SafetyMapMarker } from './kakaoMapHtml';
import SafetyFilterSheet, { SAFETY_FILTERS } from './SafetyFilterSheet';
import ConvenienceFilterSheet, {
  CONVENIENCE_FILTER,
} from './ConvenienceFilterSheet';
import type { TabScreenProps } from '../../navigation/tabs';
import { CITIES, getNearestCity } from '../../data/cities';
import { useTabBarVisibility } from '../../navigation/TabBarVisibilityContext';
import { beginMapAction, logMapDiagnostic } from '../../map/mapApiLogger';
import { useTravelCooldown } from '../../map/useTravelCooldown';
import RegionSelectSheet from './RegionSelectSheet';
import {
  CHUNGBUK_VIEWPORT,
  CHUNGBUK_OVERVIEW_BOUNDS,
  mapViewportStorage,
  type MapViewport,
} from '../../map/mapViewportStorage';
import type { City } from '../../data/cities';

type IconComponent = React.ComponentType<{ color: string; size?: number }>;

/**
 * 지도 상단 필터 칩.
 * 관광정보 API 의 contentTypeId 와 1:1로 대응하므로, 칩을 늘리려면
 * types/tourPlace.ts 의 CATEGORY_TO_CONTENT_TYPE 에 있는 것 중에서 고르면 됩니다.
 */
const CATEGORIES: TourCategory[] = [
  'attraction',
  'food',
  'culture',
  'stay',
  'festival',
];
const FACILITY_FILTERS = [...SAFETY_FILTERS, CONVENIENCE_FILTER];
const LIGHT_PATH_TYPES: SafetyPlaceType[] = ['streetlight', 'securityLight'];

/**
 * 칩에 보이는 혼행 관점 라벨. 데이터 분류(TOUR_CATEGORY_LABEL)는 그대로 두고
 * "무엇을 하러 찾는지" 가 드러나게만 바꿉니다. 혼밥 가능 여부 같은 데이터는 없으므로
 * '혼밥 장소 찾기' 처럼 탐색 목적 표현만 씁니다.
 */
const SOLO_CATEGORY_LABEL: Record<TourCategory, string> = {
  attraction: '혼자 둘러보기',
  food: '혼밥 장소 찾기',
  culture: '혼자 즐기는 문화',
  stay: '혼자 묵을 곳',
  festival: '혼자 가도 좋은 축제',
  course: TOUR_CATEGORY_LABEL.course,
  leports: TOUR_CATEGORY_LABEL.leports,
  shopping: TOUR_CATEGORY_LABEL.shopping,
};

/**
 * 칩 아이콘 — 지도 핀의 글리프와 같은 그림입니다.
 * 바꿀 때는 kakaoMapHtml.ts 의 GLYPHS 도 함께 맞춰 주세요.
 */
const CATEGORY_ICON: Record<TourCategory, IconComponent> = {
  attraction: MountainIcon,
  food: FoodIcon,
  culture: MuseumIcon,
  stay: BedIcon,
  festival: FestivalIcon,
  course: RouteIcon,
  leports: SportsIcon,
  shopping: ShoppingIcon,
};

function MapScreen({ onBack }: TabScreenProps) {
  const insets = useSafeAreaInsets();
  const travelCooldown = useTravelCooldown();
  const mapRef = useRef<KakaoMapHandle>(null);

  // 현위치 — 지도 파란 점과 비상벨의 안전시설 조회가 같은 좌표를 씁니다.
  const {
    coords: myLocation,
    status: locationStatus,
    refresh: refreshLocation,
  } = useCurrentLocation();
  /** 안내를 닫으면 이 화면에 있는 동안은 다시 띄우지 않습니다. */
  const [locationNoticeClosed, setLocationNoticeClosed] = useState(false);

  const [category, setCategory] = useState<TourCategory>('attraction');
  const [tourCategoryEnabled, setTourCategoryEnabled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [safetyTypes, setSafetyTypes] = useState<SafetyPlaceType[]>([]);
  const [draftSafetyTypes, setDraftSafetyTypes] = useState<SafetyPlaceType[]>(
    [],
  );
  const [safetyFilterOpen, setSafetyFilterOpen] = useState(false);
  const [toiletEnabled, setToiletEnabled] = useState(false);
  const [draftToiletEnabled, setDraftToiletEnabled] = useState(false);
  const [convenienceFilterOpen, setConvenienceFilterOpen] = useState(false);
  const [selectedSafetyId, setSelectedSafetyId] = useState<string | null>(null);
  /** 검색으로 여행지를 고른 후 늦게 도착한 현위치가 지도를 다시 돌리지 않게 합니다. */
  const chosenDestination = useRef(false);
  const [initialViewport, setInitialViewport] = useState(CHUNGBUK_VIEWPORT);
  const [historyReady, setHistoryReady] = useState(false);
  const [hasSavedViewport, setHasSavedViewport] = useState(false);
  const [regionSelectOpen, setRegionSelectOpen] = useState(false);
  const [outsideRegion, setOutsideRegion] = useState(false);
  const pendingMyLocation = useRef(false);
  const markDestination = useCallback(() => {
    chosenDestination.current = true;
    pendingMyLocation.current = false;
    setOutsideRegion(false);
  }, []);

  /** 지도 이동이 끝난 시점의 조회 중심점입니다. */
  const [queryCenter, setQueryCenter] = useState<Coords>(
    CHUNGBUK_VIEWPORT.center,
  );
  /** 지도가 지금 보고 있는 중심 (idle 마다 갱신) */
  const [mapCenter, setMapCenter] = useState<Coords>(CHUNGBUK_VIEWPORT.center);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [viewportRegion, setViewportRegion] = useState<{
    center: Coords;
    sigungu: string;
  } | null>(null);
  /** 사용자가 조회를 확정한 화면 영역입니다. 지도 이동만으로는 바뀌지 않습니다. */
  const [queryBounds, setQueryBounds] = useState<MapBounds | null>(null);
  /** 현재 조회 중심점에 가장 가까운 충북 시군구 (예: 괴산군, 단양군 등) */
  const currentCity = useMemo(
    () => getNearestCity(queryCenter.lat, queryCenter.lng),
    [queryCenter.lat, queryCenter.lng],
  );
  const activeFacilityTypes = useMemo<SafetyPlaceType[]>(
    () => (toiletEnabled ? [...safetyTypes, 'toilet'] : safetyTypes),
    [safetyTypes, toiletEnabled],
  );
  const safety = useSafetyPlaces(
    queryCenter,
    currentCity,
    activeFacilityTypes,
    queryBounds,
    mapBounds,
  );
  const selectedSafetyPlace = useMemo(
    () => safety.places.find(place => place.id === selectedSafetyId) ?? null,
    [safety.places, selectedSafetyId],
  );
  const safetyMarkers = useMemo<SafetyMapMarker[]>(() => {
    const metadata = Object.fromEntries(
      FACILITY_FILTERS.map(item => [item.key, item]),
    ) as Record<SafetyPlaceType, (typeof FACILITY_FILTERS)[number]>;
    return safety.places.map(place => ({
      id: place.id,
      lat: place.lat,
      lng: place.lng,
      type: place.type,
      color: metadata[place.type].color,
      label: metadata[place.type].markerLabel,
    }));
  }, [safety.places]);
  const safetyChipLabel = useMemo(() => {
    if (!safetyTypes.length) return '도움이 필요할 때';
    const nonLightTypes = safetyTypes.filter(
      type => !LIGHT_PATH_TYPES.includes(type),
    );
    const lightPathEnabled = LIGHT_PATH_TYPES.every(type =>
      safetyTypes.includes(type),
    );
    if (lightPathEnabled && !nonLightTypes.length) return '빛길';
    if (lightPathEnabled)
      return `도움이 필요할 때 ${nonLightTypes.length + 1}종`;
    if (safetyTypes.length > 1)
      return `도움이 필요할 때 ${safetyTypes.length}종`;
    return (
      SAFETY_FILTERS.find(item => item.key === safetyTypes[0])?.label ??
      '도움이 필요할 때'
    );
  }, [safetyTypes]);
  const isLightPathOnly =
    LIGHT_PATH_TYPES.every(type => safetyTypes.includes(type)) &&
    safetyTypes.every(type => LIGHT_PATH_TYPES.includes(type));
  const safetyErrorLabel = useMemo(() => {
    const labels = Array.from(
      new Set(
        safety.errors.map(
          type =>
            FACILITY_FILTERS.find(item => item.key === type)?.label ??
            '주변 시설',
        ),
      ),
    );
    if (safety.rateLimitedTypes.length) {
      return `${labels.join('·')} 요청이 많아 잠시 후 다시 확인할 수 있어요`;
    }
    return `${labels.join('·')} 정보를 불러오지 못했어요`;
  }, [safety.errors, safety.rateLimitedTypes.length]);
  const shouldShowMapResearch =
    (tourCategoryEnabled || activeFacilityTypes.length > 0) &&
    hasViewportChanged(mapBounds, queryBounds);

  // 저장된 여행 지역은 늦게 도착하는 GPS보다 우선합니다.
  useEffect(() => {
    let active = true;
    mapViewportStorage.load().then(saved => {
      if (!active) return;
      const viewport = saved ?? CHUNGBUK_VIEWPORT;
      chosenDestination.current = !!saved;
      setHasSavedViewport(!!saved);
      setInitialViewport(viewport);
      setQueryCenter(viewport.center);
      setMapCenter(viewport.center);
      setHistoryReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const moveToLocation = useCallback((center: Coords) => {
    setQueryCenter(center);
    setMapCenter(center);
    setQueryBounds(null);
    mapRef.current?.moveTo(center.lat, center.lng, 4);
  }, []);

  useEffect(() => {
    if (locationStatus === 'granted' && pendingMyLocation.current) {
      pendingMyLocation.current = false;
      moveToLocation(myLocation);
    }
  }, [locationStatus, myLocation, moveToLocation]);

  const handleMyRegion = useCallback(
    (inside: boolean | null, center: Coords) => {
      if (
        chosenDestination.current ||
        center.lat !== myLocation.lat ||
        center.lng !== myLocation.lng
      )
        return;
      chosenDestination.current = true;
      if (inside) moveToLocation(center);
      else if (inside === false) setOutsideRegion(true);
    },
    [myLocation, moveToLocation],
  );

  const handleViewportRegion = useCallback(
    (viewport: MapViewport, inside: boolean | null, sigungu: string | null) => {
      setViewportRegion(
        inside === true && sigungu
          ? { center: viewport.center, sigungu }
          : null,
      );
      if (inside === true) mapViewportStorage.save(viewport);
    },
    [],
  );

  const handleMyLocation = useCallback(() => {
    markDestination();
    if (locationStatus === 'granted') moveToLocation(myLocation);
    else {
      pendingMyLocation.current = true;
      refreshLocation();
    }
  }, [
    locationStatus,
    myLocation,
    refreshLocation,
    markDestination,
    moveToLocation,
  ]);

  /** 축제 레이어의 기간 필터 (축제 칩을 골랐을 때만 보입니다) */
  const [festivalRange, setFestivalRange] = useState<FestivalRange>('now');
  const isFestival = tourCategoryEnabled && category === 'festival';

  // 비상벨 화면 — 하단 탭바까지 덮는 전체 화면으로 열립니다.
  const [sosOpen, setSosOpen] = useState(false);

  // 검색 상태 — 오버레이 표시 / 지도에 찍힌 결과 / 그중 선택된 항목
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchPoi[]>([]);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);

  const { setTabBarHidden } = useTabBarVisibility();

  // 검색 오버레이나 SOS가 열리면 하단 탭바를 숨깁니다.
  useEffect(() => {
    setTabBarHidden(searchOpen || sosOpen);
    return () => setTabBarHidden(false);
  }, [searchOpen, sosOpen, setTabBarHidden]);

  // 안드로이드 하드웨어 뒤로가기 버튼 처리
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (sosOpen) {
          setSosOpen(false);
          return true;
        }
        if (searchOpen) {
          setSearchOpen(false);
          return true;
        }
        if (regionSelectOpen) {
          setRegionSelectOpen(false);
          return true;
        }
        if (safetyFilterOpen) {
          setSafetyFilterOpen(false);
          return true;
        }
        if (convenienceFilterOpen) {
          setConvenienceFilterOpen(false);
          return true;
        }
        if (selectedId || selectedPoiId) {
          setSelectedId(null);
          setSelectedPoiId(null);
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [
    sosOpen,
    searchOpen,
    regionSelectOpen,
    safetyFilterOpen,
    convenienceFilterOpen,
    selectedId,
    selectedPoiId,
  ]);

  /*
   * 축제는 다른 API 를 씁니다.
   * 관광정보 조회(locationBasedList)로는 contentTypeId=15 결과가 거의 0건이고,
   * 행사 전용 API에 충북 코드를 보내고 현재 지도 화면으로 한 번 더 거릅니다.
   */
  const {
    places: tourPlaces,
    loading: tourLoading,
    error: tourError,
    retry: retryTour,
    refreshing: tourRefreshing,
  } = useNearbyPlaces(
    queryCenter,
    currentCity,
    category,
    tourCategoryEnabled && category !== 'festival',
    undefined,
    queryBounds,
  );

  const {
    places: festivalPlaces,
    loading: festivalLoading,
    error: festivalError,
    retry: retryFestivals,
  } = useNearbyFestivals(
    queryCenter,
    festivalRange,
    undefined,
    queryBounds,
    isFestival,
  );

  const places = useMemo(
    () =>
      !tourCategoryEnabled ? [] : isFestival ? festivalPlaces : tourPlaces,
    [tourCategoryEnabled, isFestival, festivalPlaces, tourPlaces],
  );
  const placesLoading = tourCategoryEnabled
    ? isFestival
      ? festivalLoading
      : tourLoading
    : false;
  const placesError = tourCategoryEnabled
    ? isFestival
      ? festivalError
      : tourError
    : null;
  const retryPlaces = isFestival ? retryFestivals : retryTour;

  // 검색 결과에서 직접 고른 관광지 (현재 지역 목록에 아직 없어도 지도에 즉시 표시)
  const [selectedSearchPlace, setSelectedSearchPlace] =
    useState<MappableTourContent | null>(null);

  const allMapPlaces = useMemo(() => {
    if (
      selectedSearchPlace &&
      !places.some(p => p.contentId === selectedSearchPlace.contentId)
    ) {
      return [selectedSearchPlace, ...places];
    }
    return places;
  }, [places, selectedSearchPlace]);

  /**
   * 상단 안전 배지 — 지도 중심의 행정구역과 랭킹의 공용 안전 데이터를 사용합니다.
   * 이동 후 행정구역 확인이 끝나기 전에는 이전 지역의 배지를 숨깁니다.
   */
  const safetyBadge = useRegionSafety(
    viewportRegion &&
      Math.abs(viewportRegion.center.lat - mapCenter.lat) < 0.0000001 &&
      Math.abs(viewportRegion.center.lng - mapCenter.lng) < 0.0000001
      ? viewportRegion.sigungu
      : null,
  );

  const selectedPlace = useMemo(() => {
    if (selectedSearchPlace && selectedSearchPlace.contentId === selectedId) {
      return selectedSearchPlace;
    }
    return places.find(place => place.contentId === selectedId) ?? null;
  }, [places, selectedId, selectedSearchPlace]);

  /**
   * 상단 UI 아래에서 시작하는 요소들(우측 버튼·재검색)의 y 좌표.
   * 축제 기간 칩이 한 줄 더 생기면 그만큼 밀어 내립니다.
   */
  const topLayerBottom = insets.top + 128 + (isFestival ? 42 : 0);

  /**
   * 현위치를 못 쓰는 상태의 안내.
   * 좌표가 기본값(단양)으로 떨어져 있는데 아무 설명이 없으면, 사용자는 왜 엉뚱한
   * 지역이 보이는지 알 방법이 없습니다.
   */
  const locationNotice = (() => {
    if (locationNoticeClosed) {
      return null;
    }
    if (locationStatus === 'blocked') {
      return {
        text: '위치 권한이 꺼져 있어요. 여행 지역은 직접 고를 수 있어요',
        action: '설정 열기',
        onAction: () => Linking.openSettings(),
      };
    }
    if (locationStatus === 'denied') {
      return {
        text: '위치 권한을 허용하면 내 주변을 볼 수 있어요',
        action: '허용하기',
        onAction: refreshLocation,
      };
    }
    if (locationStatus === 'unavailable') {
      return {
        text: '현위치를 찾지 못했어요. 여행 지역은 직접 고를 수 있어요',
        action: '다시 시도',
        onAction: refreshLocation,
      };
    }
    if (outsideRegion)
      return {
        text: '충북 여행을 준비 중이신가요? 지역을 골라보세요',
        action: '지역 선택',
        onAction: () => {
          markDestination();
          setRegionSelectOpen(true);
        },
      };
    return null;
  })();

  const selectedPoiIndex = useMemo(
    () => searchResults.findIndex(poi => poi.id === selectedPoiId),
    [searchResults, selectedPoiId],
  );
  const selectedPoi =
    selectedPoiIndex >= 0 ? searchResults[selectedPoiIndex] : null;

  /** 필터 탐색으로 전환할 때 이전 검색 마커와 카드를 함께 정리합니다. */
  const clearSearchSelection = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPoiId(null);
    setSelectedSearchPlace(null);
    setSelectedId(null);
    mapRef.current?.clearSearchMarkers();
  }, []);

  /** 검색 결과는 사용자가 선택했던 필터와 독립적으로 표시합니다. */
  const resetFiltersForSearch = useCallback(() => {
    setTourCategoryEnabled(false);
    setSafetyTypes([]);
    setDraftSafetyTypes([]);
    setToiletEnabled(false);
    setDraftToiletEnabled(false);
    setSelectedSafetyId(null);
    setSafetyFilterOpen(false);
    setConvenienceFilterOpen(false);
  }, []);

  const selectRegion = useCallback(
    (city: City | null) => {
      markDestination();
      clearSearchSelection();
      resetFiltersForSearch();
      setRegionSelectOpen(false);
      const viewport = city
        ? { center: city.center, level: 7 }
        : CHUNGBUK_VIEWPORT;
      setQueryCenter(viewport.center);
      setMapCenter(viewport.center);
      setQueryBounds(null);
      mapViewportStorage.save(viewport);
      if (city) mapRef.current?.moveTo(city.center.lat, city.center.lng, 7);
      else mapRef.current?.fitRegionBounds(CHUNGBUK_OVERVIEW_BOUNDS);
    },
    [markDestination, clearSearchSelection, resetFiltersForSearch],
  );

  const traceFilterAction = useCallback(
    (filter: string, enabled: boolean) => {
      markDestination();
      const actionId = beginMapAction('filter.click', {
        filter,
        enabled,
        mapCenter,
        mapBounds,
        previousQueryCenter: queryCenter,
        previousQueryBounds: queryBounds,
        requestedCenter: mapCenter,
        requestedBounds: mapBounds,
        city: currentCity.sigungu,
      });
      mapRef.current?.traceViewport(actionId);
    },
    [
      mapCenter,
      mapBounds,
      queryCenter,
      queryBounds,
      currentCity.sigungu,
      markDestination,
    ],
  );

  useEffect(() => {
    logMapDiagnostic('query.state', {
      category,
      enabled: tourCategoryEnabled,
      queryCenter,
      queryBounds,
      city: currentCity.sigungu,
      districtCodes: currentCity.tourismDistrictCodes ?? [
        currentCity.districtCode,
      ],
      facilityTypes: activeFacilityTypes,
    });
  }, [
    category,
    tourCategoryEnabled,
    queryCenter,
    queryBounds,
    currentCity,
    activeFacilityTypes,
  ]);

  const handleCategory = useCallback(
    (next: TourCategory) => {
      traceFilterAction(next, !(tourCategoryEnabled && next === category));
      clearSearchSelection();
      if (tourCategoryEnabled && next === category) {
        setTourCategoryEnabled(false);
        setSelectedId(null);
        return;
      }
      setTourCategoryEnabled(true);
      setCategory(next);
      setQueryCenter(mapCenter);
      setQueryBounds(mapBounds);
      setSelectedId(null); // 현재 보고 있는 지역을 기준으로 새 카테고리를 조회합니다.
    },
    [
      tourCategoryEnabled,
      category,
      mapCenter,
      mapBounds,
      clearSearchSelection,
      traceFilterAction,
    ],
  );

  const handleViewportChanged = useCallback(
    (center: Coords, bounds?: MapBounds) => {
      logMapDiagnostic('viewport.received', { center, bounds });
      setMapCenter(center);
      if (bounds) {
        setMapBounds(bounds);
        // 지도가 처음 준비됐을 때만 자동으로 최초 조회 범위를 잡습니다.
        // 이후 이동은 사용자가 '이 지역에서 다시 찾기'로 확정합니다.
        if (!queryBounds) {
          setQueryCenter(center);
          setQueryBounds(bounds);
        }
      }
    },
    [queryBounds],
  );

  const researchCurrentViewport = useCallback(() => {
    if (!mapBounds) return;
    traceFilterAction('research', true);
    setQueryCenter(mapCenter);
    setQueryBounds(mapBounds);
    setSelectedId(null);
    setSelectedSafetyId(null);
    setSelectedPoiId(null);
  }, [mapBounds, mapCenter, traceFilterAction]);

  const handleMarkerPress = useCallback((id: string) => {
    setSelectedId(id);
    setSelectedPoiId(null); // 두 카드가 겹치지 않게 한쪽만 엽니다.
  }, []);

  const handleSearchMarkerPress = useCallback((id: string) => {
    setSelectedId(null);
    setSelectedPoiId(id);
    mapRef.current?.selectSearchMarker(id);
  }, []);

  const handleMapPress = useCallback(() => {
    setSelectedId(null);
    setSelectedSafetyId(null);
    setSelectedPoiId(null);
  }, []);

  const toggleDraftSafetyType = useCallback((type: SafetyPlaceType) => {
    const types = type === 'securityLight' ? LIGHT_PATH_TYPES : [type];
    setDraftSafetyTypes(current =>
      types.every(item => current.includes(item))
        ? current.filter(item => !types.includes(item))
        : [...new Set([...current, ...types])],
    );
  }, []);

  const openSafetyFilter = useCallback(() => {
    setDraftSafetyTypes(safetyTypes);
    setSelectedId(null);
    setSelectedSafetyId(null);
    setSafetyFilterOpen(true);
  }, [safetyTypes]);

  const applySafetyFilter = useCallback(() => {
    traceFilterAction(
      `safety:${draftSafetyTypes.join(',')}`,
      draftSafetyTypes.length > 0,
    );
    clearSearchSelection();
    setSafetyTypes(draftSafetyTypes);
    setQueryCenter(mapCenter);
    setQueryBounds(mapBounds);
    setSelectedSafetyId(null);
    setSafetyFilterOpen(false);
  }, [
    draftSafetyTypes,
    mapCenter,
    mapBounds,
    clearSearchSelection,
    traceFilterAction,
  ]);

  const applyConvenienceFilter = useCallback(() => {
    traceFilterAction('toilet', draftToiletEnabled);
    clearSearchSelection();
    setToiletEnabled(draftToiletEnabled);
    setQueryCenter(mapCenter);
    setQueryBounds(mapBounds);
    setSelectedSafetyId(null);
    setConvenienceFilterOpen(false);
  }, [
    draftToiletEnabled,
    mapCenter,
    mapBounds,
    clearSearchSelection,
    traceFilterAction,
  ]);

  const handleSafetyMarkerPress = useCallback((id: string) => {
    setSelectedId(null);
    setSelectedPoiId(null);
    setSelectedSafetyId(id);
  }, []);

  const closeSheet = useCallback(() => setSelectedId(null), []);

  /* ── 검색 ── */

  const runSearch = useCallback(async (query: string) => {
    const result = (await mapRef.current?.search(query)) ?? {
      items: [],
      status: 'ERROR' as const,
    };

    const items = result.items.filter(item => {
      const address = item.roadAddress || item.address;
      return /^(충청북도|충북)(\s|$)/.test(address.trim());
    });
    return {
      ...result,
      items,
      status: items.length ? ('OK' as const) : result.status,
    };
  }, []);

  /** 검색 결과 마커를 지도에 올리고, 특정 항목이 있으면 강조합니다. */
  const applyResults = useCallback(
    (items: SearchPoi[], query: string, focusId: string | null) => {
      resetFiltersForSearch();
      markDestination();
      setSelectedSearchPlace(null);
      setSearchQuery(query);
      setSearchResults(items);
      setSelectedId(null);
      setSelectedPoiId(focusId);
      setSearchOpen(false);
      // fit 은 개별 선택이 아닐 때만 — 하나를 고른 경우엔 그 자리로 이동합니다.
      mapRef.current?.showSearchMarkers(items, focusId === null);
      if (focusId) mapRef.current?.selectSearchMarker(focusId);
    },
    [resetFiltersForSearch, markDestination],
  );

  const handleSelectPoi = useCallback(
    (poi: SearchPoi, all: SearchPoi[], query: string) => {
      if (poi.id.startsWith('region:')) {
        const cityId = poi.id.slice('region:'.length);
        const city = CITIES.find(item => item.id === cityId);
        if (city) {
          resetFiltersForSearch();
          const center = city.center;
          markDestination();
          setSearchQuery(city.name);
          setSearchResults([]);
          setSelectedPoiId(null);
          setSelectedSearchPlace(null);
          setSelectedId(null);
          setSearchOpen(false);
          setQueryCenter(center);
          setQueryBounds(null);
          setMapCenter(center);
          mapRef.current?.clearSearchMarkers();
          // 도시 결과는 핀 하나가 아니라 해당 지역을 탐색하는 진입점입니다.
          mapRef.current?.moveTo(center.lat, center.lng, 7);
          return;
        }
      }
      markDestination();
      applyResults(all.length ? all : [poi], query || poi.name, poi.id);
    },
    [applyResults, resetFiltersForSearch, markDestination],
  );

  const handleSubmitSearch = useCallback(
    (items: SearchPoi[], query: string) => applyResults(items, query, null),
    [applyResults],
  );

  /** 관광정보 검색 장소는 필터를 켜지 않고 별도 마커와 상세 카드로 표시합니다. */
  const handleSelectPlace = useCallback(
    (place: MappableTourContent) => {
      resetFiltersForSearch();
      const center = { lat: place.lat, lng: place.lng };
      markDestination();
      setSelectedSearchPlace(place);
      setSearchQuery(place.title);
      setSearchResults([]);
      setSelectedPoiId(null);
      setSearchOpen(false);
      mapRef.current?.clearSearchMarkers();
      setQueryCenter(center);
      setQueryBounds(null);
      setMapCenter(center);
      setSelectedId(place.contentId);
      mapRef.current?.moveTo(place.lat, place.lng);
    },
    [resetFiltersForSearch, markDestination],
  );

  /** 카드에서 이전/다음 결과로 넘기기 */
  const stepPoi = useCallback(
    (delta: number) => {
      if (!searchResults.length || selectedPoiIndex < 0) return;
      const next =
        (selectedPoiIndex + delta + searchResults.length) %
        searchResults.length;
      const id = searchResults[next].id;
      setSelectedPoiId(id);
      mapRef.current?.selectSearchMarker(id);
    },
    [searchResults, selectedPoiIndex],
  );

  /** 검색 결과 전체 해제 (검색바의 × 버튼) */
  const clearSearch = useCallback(() => {
    clearSearchSelection();
    setSearchOpen(false);
  }, [clearSearchSelection]);

  const closePoiCard = useCallback(() => {
    setSelectedPoiId(null);
    mapRef.current?.selectSearchMarker(null);
  }, []);

  if (!historyReady)
    return (
      <View style={styles.locationLoading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );

  return (
    <View style={styles.container}>
      <KakaoMap
        ref={mapRef}
        places={allMapPlaces}
        category={category}
        selectedId={selectedId}
        safetyPlaces={safetyMarkers}
        selectedSafetyId={selectedSafetyId}
        myLocation={myLocation}
        initialViewport={initialViewport}
        initialBounds={hasSavedViewport ? undefined : CHUNGBUK_OVERVIEW_BOUNDS}
        centerOnMyLocation={false}
        resolveMyRegion={locationStatus === 'granted'}
        onMyRegion={handleMyRegion}
        onViewportRegion={handleViewportRegion}
        onUserInteraction={markDestination}
        onMarkerPress={handleMarkerPress}
        onSafetyMarkerPress={handleSafetyMarkerPress}
        onSearchMarkerPress={handleSearchMarkerPress}
        onMapPress={handleMapPress}
        onCenterChanged={handleViewportChanged}
      />

      {/* 상단 검색바 + 필터칩 — pointerEvents="box-none" 이라야 빈 곳으로 지도 조작이 통과합니다 */}
      <View
        style={[styles.topLayer, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <View style={styles.searchRow}>
          <Pressable
            style={styles.circleButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="뒤로"
          >
            <Chevron direction="left" color={colors.textPrimary} size={18} />
          </Pressable>

          <Pressable
            style={styles.searchBar}
            onPress={() => {
              markDestination();
              setSearchOpen(true);
            }}
            accessibilityRole="search"
            accessibilityLabel="장소 검색"
          >
            <SearchIcon color={colors.textSecondary} size={18} />
            <Text style={styles.searchText} numberOfLines={1}>
              {searchQuery ||
                (safetyBadge
                  ? `${safetyBadge.regionName} 주변`
                  : '혼자 갈 곳을 검색해 보세요')}
            </Text>
            {searchQuery ? (
              // 검색 중일 때는 안전 등급 자리에 검색 해제 버튼을 둡니다.
              <Pressable
                onPress={event => {
                  event.stopPropagation();
                  clearSearch();
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="검색 결과 지우기"
              >
                <View style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>×</Text>
                </View>
              </Pressable>
            ) : safetyBadge ? (
              // 랭킹과 같은 혼행 안전 상태. 확인된 데이터가 없으면 숨깁니다.
              <View
                style={[
                  styles.gradeBadge,
                  safetyBadge.status === '안전 보통' && styles.gradeBadgeNormal,
                  safetyBadge.status === '안전 주의' && styles.gradeBadgeCheck,
                ]}
              >
                <Text
                  style={[
                    styles.gradeBadgeText,
                    safetyBadge.status === '안전 보통' &&
                      styles.gradeTextNormal,
                    safetyBadge.status === '안전 주의' && styles.gradeTextCheck,
                  ]}
                >
                  {safetyBadge.status}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            style={styles.regionButton}
            onPress={() => {
              markDestination();
              setSelectedId(null);
              setSelectedPoiId(null);
              setSelectedSafetyId(null);
              setRegionSelectOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="충북 지역 선택"
          >
            <Text style={styles.regionButtonText}>지역 선택</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <FilterChip
            label={safetyChipLabel}
            count={null}
            Icon={isLightPathOnly ? LampPendantIcon : ShieldCheckIcon}
            selected={safetyTypes.length > 0}
            onPress={openSafetyFilter}
          />
          {CATEGORIES.map(key => (
            <FilterChip
              key={key}
              label={SOLO_CATEGORY_LABEL[key]}
              // 선택된 칩만 실제 조회 결과가 있으므로 그때만 개수를 보여 줍니다.
              count={
                tourCategoryEnabled && key === category ? places.length : null
              }
              Icon={CATEGORY_ICON[key]}
              selected={tourCategoryEnabled && key === category}
              onPress={() => handleCategory(key)}
            />
          ))}
          <FilterChip
            label={toiletEnabled ? CONVENIENCE_FILTER.label : '편의시설'}
            count={null}
            Icon={ToiletIcon}
            selected={toiletEnabled}
            onPress={() => {
              setDraftToiletEnabled(toiletEnabled);
              setSelectedId(null);
              setSelectedSafetyId(null);
              setConvenienceFilterOpen(true);
            }}
          />
          {safety.loading && (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          )}
          {!!safety.hasMoreTypes.length && !safety.loading && (
            <View style={styles.safetyLimitNotice}>
              <Text style={styles.safetyLimitNoticeText}>
                안전시설이 많아요 · 지도를 확대해 주세요
              </Text>
            </View>
          )}
        </ScrollView>

        {/* 축제를 골랐을 때만 뜨는 기간 칩 */}
        {isFestival && (
          <View style={styles.rangeRow}>
            {FESTIVAL_RANGES.map(key => {
              const on = key === festivalRange;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    setFestivalRange(key);
                    setSelectedId(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.rangeChip, on && styles.rangeChipOn]}
                >
                  <Text style={[styles.rangeText, on && styles.rangeTextOn]}>
                    {FESTIVAL_RANGE_LABEL[key]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* 우측 플로팅 버튼 */}
      <View
        style={[styles.sideLayer, { top: topLayerBottom }]}
        pointerEvents="box-none"
      >
        <Pressable
          style={styles.floatButton}
          onPress={handleMyLocation}
          accessibilityRole="button"
          accessibilityLabel="현위치로 이동"
        >
          <MyLocationIcon color={colors.textPrimary} size={20} />
        </Pressable>

        {/* 확대/축소 — 핀치 제스처가 안 먹는 환경(에뮬레이터 등)에서도 쓸 수 있게 둡니다 */}
        <View style={styles.zoomGroup}>
          <Pressable
            style={styles.zoomButton}
            onPress={() => {
              markDestination();
              mapRef.current?.zoomIn();
            }}
            accessibilityRole="button"
            accessibilityLabel="확대"
          >
            <Text style={styles.zoomText}>+</Text>
          </Pressable>
          <View style={styles.zoomDivider} />
          <Pressable
            style={styles.zoomButton}
            onPress={() => {
              markDestination();
              mapRef.current?.zoomOut();
            }}
            accessibilityRole="button"
            accessibilityLabel="축소"
          >
            <Text style={styles.zoomText}>−</Text>
          </Pressable>
        </View>
      </View>

      {/* SOS — 시트나 검색 카드가 열리면 가려지지 않게 숨깁니다 */}
      {!selectedPlace && !selectedPoi && !selectedSafetyPlace && (
        <Pressable
          style={[styles.sos, { bottom: insets.bottom + 76 }]}
          onPress={() => setSosOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="긴급 SOS"
        >
          <SirenIcon color={colors.textOnPrimary} size={22} weight="fill" />
          <Text style={styles.sosText}>SOS</Text>
        </Pressable>
      )}

      {/* 현위치를 못 쓸 때의 안내 — 왜 기본 지역이 보이는지 알리고 복구 수단을 줍니다.
          아래 재검색·재시도 버튼과 자리가 같으므로 이 안내가 우선입니다. */}
      {locationNotice && !selectedPlace && !selectedPoi && (
        <View style={[styles.locationNotice, { top: topLayerBottom }]}>
          <Text style={styles.locationNoticeText} numberOfLines={2}>
            {locationNotice.text}
          </Text>
          <Pressable
            style={styles.locationNoticeAction}
            onPress={locationNotice.onAction}
            accessibilityRole="button"
            accessibilityLabel={locationNotice.action}
          >
            <Text style={styles.locationNoticeActionText}>
              {locationNotice.action}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setLocationNoticeClosed(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="안내 닫기"
          >
            <Text style={styles.locationNoticeClose}>×</Text>
          </Pressable>
        </View>
      )}

      {shouldShowMapResearch &&
        !placesLoading &&
        travelCooldown === 0 &&
        !safety.loading &&
        !placesError &&
        !locationNotice &&
        !selectedPlace &&
        !selectedPoi &&
        !selectedSafetyPlace && (
          <Pressable
            style={[styles.researchButton, { top: topLayerBottom }]}
            onPress={researchCurrentViewport}
            accessibilityRole="button"
            accessibilityLabel="현재 지도 영역에서 다시 찾기"
          >
            <Text style={styles.researchText}>이 지역에서 다시 찾기</Text>
          </Pressable>
        )}

      {/* 조회 실패 안내 — 지도는 그대로 두고 다시 시도만 권합니다 */}
      {travelCooldown > 0 && tourCategoryEnabled && !locationNotice && (
        <View style={[styles.researchButton, { top: topLayerBottom }]}>
          <Text style={styles.researchText}>
            {(isFestival ? festivalLoading : tourRefreshing)
              ? `잠시 후 다시 불러올게요 · ${travelCooldown}초`
              : `요청이 많아요 · ${travelCooldown}초 후 다시 시도해 주세요`}
          </Text>
        </View>
      )}
      {placesError &&
        !placesLoading &&
        !locationNotice &&
        travelCooldown === 0 && (
          <Pressable
            style={[styles.researchButton, { top: topLayerBottom }]}
            onPress={retryPlaces}
            accessibilityRole="button"
            accessibilityLabel="주변 정보 다시 불러오기"
          >
            <Text style={styles.researchText}>{placesError} · 다시 시도</Text>
          </Pressable>
        )}

      {!placesLoading &&
        travelCooldown === 0 &&
        !placesError &&
        !places.length &&
        tourCategoryEnabled &&
        !!queryBounds &&
        !locationNotice &&
        !selectedPoi &&
        !selectedSafetyPlace && (
          <View style={[styles.emptyNotice, { top: topLayerBottom }]}>
            <Text style={styles.emptyNoticeTitle}>
              현재 화면에 {TOUR_CATEGORY_LABEL[category]} 정보가 없어요
            </Text>
            <Text style={styles.emptyNoticeText}>
              지도를 조금 축소하거나 다른 지역으로 이동해 보세요
            </Text>
          </View>
        )}

      {!!safety.errors.length &&
        !safety.loading &&
        !selectedPlace &&
        !selectedPoi &&
        !selectedSafetyPlace && (
          <View
            style={[styles.safetyErrorBanner, { bottom: insets.bottom + 24 }]}
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.safetyErrorText} numberOfLines={2}>
              {safetyErrorLabel}
            </Text>
            <Pressable
              onPress={safety.retry}
              accessibilityRole="button"
              accessibilityLabel={`${safetyErrorLabel}, 다시 시도`}
              hitSlop={8}
              style={styles.safetyErrorAction}
            >
              <Text style={styles.safetyErrorActionText}>
                {safety.rateLimitedTypes.length
                  ? '잠시 후 다시 시도'
                  : '다시 시도'}
              </Text>
            </Pressable>
          </View>
        )}

      {/* 검색 결과가 있는데 아무것도 안 골랐을 때의 요약 배너 */}
      {searchResults.length > 0 &&
        !selectedPoi &&
        !selectedPlace &&
        !safety.errors.length && (
          <View
            style={[styles.resultBanner, { bottom: insets.bottom + 24 }]}
            pointerEvents="none"
          >
            <Text style={styles.resultBannerText}>
              "{searchQuery}" 검색 결과 {searchResults.length}곳
            </Text>
          </View>
        )}

      <PoiCard
        poi={selectedPoi}
        index={selectedPoiIndex}
        total={searchResults.length}
        onPrev={() => stepPoi(-1)}
        onNext={() => stepPoi(1)}
        onClose={closePoiCard}
      />

      {selectedSafetyPlace && (
        <View style={[styles.safetyCard, { bottom: insets.bottom + 20 }]}>
          <View style={styles.safetyCardHeader}>
            <Text style={styles.safetyCardKind}>
              {
                FACILITY_FILTERS.find(
                  item => item.key === selectedSafetyPlace.type,
                )?.markerLabel
              }
            </Text>
            <Pressable
              onPress={() => setSelectedSafetyId(null)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="안전 장소 정보 닫기"
            >
              <Text style={styles.safetyCardClose}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.safetyCardTitle}>{selectedSafetyPlace.name}</Text>
          {!!selectedSafetyPlace.address && (
            <Text style={styles.safetyCardAddress} numberOfLines={2}>
              {selectedSafetyPlace.address}
            </Text>
          )}
          {!!selectedSafetyPlace.installDetail &&
            selectedSafetyPlace.installDetail !== selectedSafetyPlace.name && (
              <Text style={styles.safetyCardDetail} numberOfLines={2}>
                설치 위치 · {selectedSafetyPlace.installDetail}
              </Text>
            )}
          {!!selectedSafetyPlace.regionName && (
            <Text style={styles.safetyCardMeta}>
              관리 지역 · {selectedSafetyPlace.regionName}
            </Text>
          )}
          {!!selectedSafetyPlace.phone && (
            <Pressable
              onPress={() =>
                Linking.openURL(`tel:${selectedSafetyPlace.phone}`)
              }
            >
              <Text style={styles.safetyCardPhone}>
                {selectedSafetyPlace.phone}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      <TourPlaceSheet place={selectedPlace} onClose={closeSheet} />

      <RegionSelectSheet
        visible={regionSelectOpen}
        onClose={() => setRegionSelectOpen(false)}
        onSelect={selectRegion}
      />

      <SafetyFilterSheet
        visible={safetyFilterOpen}
        selected={draftSafetyTypes}
        onToggle={toggleDraftSafetyType}
        onClear={() => setDraftSafetyTypes([])}
        onApply={applySafetyFilter}
        onClose={() => setSafetyFilterOpen(false)}
      />

      <ConvenienceFilterSheet
        visible={convenienceFilterOpen}
        selected={draftToiletEnabled}
        onToggle={() => setDraftToiletEnabled(current => !current)}
        onClear={() => setDraftToiletEnabled(false)}
        onApply={applyConvenienceFilter}
        onClose={() => setConvenienceFilterOpen(false)}
      />

      <SosScreen visible={sosOpen} onClose={() => setSosOpen(false)} />

      <MapSearchOverlay
        visible={searchOpen}
        onSearch={runSearch}
        onSelectPlace={handleSelectPlace}
        onSelectPoi={handleSelectPoi}
        onSubmit={handleSubmitSearch}
        onClose={() => setSearchOpen(false)}
      />
    </View>
  );
}

type ChipProps = {
  label: string;
  /** null 이면 개수 배지를 그리지 않습니다(아직 조회하지 않은 카테고리). */
  count: number | null;
  Icon: IconComponent;
  selected: boolean;
  onPress: () => void;
};

/** 아이콘 + 라벨 + 개수 배지를 함께 쓰는 지도 전용 칩 */
function FilterChip({ label, count, Icon, selected, onPress }: ChipProps) {
  const tint = selected ? colors.inkText : colors.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
    >
      <Icon color={tint} size={16} />
      <Text style={[styles.chipText, { color: tint }]}>{label}</Text>
      {count !== null && (
        <Text style={[styles.chipCount, selected && styles.chipCountOn]}>
          {count}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  locationLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  locationLoadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  topLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  regionButton: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    elevation: 1,
  },
  regionButtonText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 1,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 1,
  },
  searchText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  gradeBadge: {
    backgroundColor: colors.safeBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
  },
  gradeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.safeText,
  },
  gradeBadgeNormal: { backgroundColor: '#fff6db' },
  gradeBadgeCheck: { backgroundColor: colors.dangerSoft },
  gradeTextNormal: { color: '#a66b00' },
  gradeTextCheck: { color: colors.danger },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  chipRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  safetyLimitNotice: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: colors.background,
  },
  safetyLimitNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  safetyCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  safetyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  safetyCardKind: { fontSize: 12, fontWeight: '700', color: colors.primary },
  safetyCardClose: {
    fontSize: 24,
    lineHeight: 26,
    color: colors.textSecondary,
  },
  safetyCardTitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  safetyCardAddress: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  safetyCardDetail: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textPrimary,
  },
  safetyCardMeta: {
    marginTop: 5,
    fontSize: 11,
    color: colors.textTertiary,
  },
  safetyCardPhone: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 1,
  },
  chipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipOff: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipCountOn: {
    color: colors.goldSoft,
  },

  sideLayer: {
    position: 'absolute',
    right: 16,
    gap: 10,
  },
  floatButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 1,
  },

  zoomGroup: {
    marginTop: 2,
    width: 42,
    borderRadius: 21,
    backgroundColor: colors.background,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 1,
  },
  zoomButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    marginHorizontal: 10,
    backgroundColor: colors.border,
  },
  zoomText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  sos: {
    position: 'absolute',
    right: 18,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 10,
  },
  sosText: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },

  resultBanner: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(27,34,51,0.9)',
  },
  resultBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkText,
  },
  safetyErrorBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 52,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  safetyErrorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  safetyErrorAction: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  safetyErrorActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryStrong,
  },

  // 축제 기간 칩 — 카테고리 칩 바로 아래 줄
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  rangeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeChipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  rangeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rangeTextOn: {
    color: colors.inkText,
  },

  // 위치·조회 오류 안내 — 필터/현위치 버튼과 같은 높이의 중앙 알약 버튼
  locationNotice: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 9,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  locationNoticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textPrimary,
  },
  locationNoticeAction: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  locationNoticeActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  locationNoticeClose: {
    fontSize: 20,
    lineHeight: 22,
    color: colors.textSecondary,
    paddingHorizontal: 2,
  },

  researchButton: {
    position: 'absolute',
    alignSelf: 'center',
    minHeight: 38,
    minWidth: 150,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    // 지도 위에 떠 보이도록 그림자를 줍니다.
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  researchText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyNotice: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '82%',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  emptyNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyNoticeText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default MapScreen;
