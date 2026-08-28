/**
 * WebView 에 주입할 카카오맵 HTML 문자열을 만듭니다.
 *
 * 마커는 kakao.maps.Marker(이미지 기반) 가 아니라 **CustomOverlay** 를 씁니다.
 * CustomOverlay 는 임의의 DOM 을 그대로 지도 위에 올려주기 때문에,
 * 방패 핀·그림자·선택 애니메이션을 전부 CSS 로 표현할 수 있습니다.
 *
 * 통신 규약
 *  - Web → RN : window.ReactNativeWebView.postMessage(JSON)
 *      { type: 'ready' }                       지도 로드 완료
 *      { type: 'markerPress', id }             마커 탭
 *      { type: 'searchMarkerPress', id }       검색 결과 마커 탭
 *      { type: 'mapPress' }                    빈 지도 탭 (시트 닫기용)
 *      { type: 'centerChanged', lat, lng }     지도 이동이 멎었을 때의 새 중심
 *      { type: 'searchResult', reqId, items }  키워드 검색 응답
 *      { type: 'error', message }              SDK 로드 실패 등
 *  - RN → Web : injectJavaScript 로 아래 전역 함수 호출
 *      window.__setPlaces(list)                마커 전체 교체 (관광정보 API 결과)
 *      window.__setCategory(category)          카테고리 필터 변경
 *      window.__selectPlace(id | null)         선택 마커 강조
 *      window.__moveToMyLocation()             현위치로 이동
 *      window.__setMyLocation(lat, lng)        현위치 점 좌표 갱신
 *      window.__zoomIn() / window.__zoomOut()  확대 / 축소
 *      window.__search(query, reqId)           카카오 장소 키워드 검색
 *      window.__showSearchMarkers(items, fit)  검색 결과 마커 표시
 *      window.__clearSearchMarkers()           검색 결과 마커 제거
 *      window.__selectSearchMarker(id | null)  검색 결과 마커 강조 + 이동
 *      window.__moveTo(lat, lng, level)        임의 좌표로 이동
 */
import { KAKAO_JS_KEY } from '../../config/kakao';
import { TOUR_CATEGORY_COLOR, type TourCategory } from '../../types/tourPlace';

/** 웹뷰로 넘기는 마커 한 건 — 좌표·색만 있으면 그릴 수 있습니다. */
export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  category: TourCategory;
  color: string;
};

export type SafetyMapMarker = {
  id: string;
  lat: number;
  lng: number;
  type: string;
  color: string;
  glyph: string;
};

/** TourPlace 배열을 웹뷰가 쓰는 마커 데이터로 줄입니다. */
export function toMapMarkers(
  places: { id: string; lat: number; lng: number; category: TourCategory }[],
): MapMarker[] {
  return places.map(p => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    category: p.category,
    color: TOUR_CATEGORY_COLOR[p.category],
  }));
}

type Options = {
  center: { lat: number; lng: number };
  myLocation: { lat: number; lng: number };
  /**
   * 처음 보여 줄 카테고리.
   * 마커는 API 응답이 온 뒤 __setPlaces 로 들어오므로 여기서는 필터값만 정합니다.
   */
  initialCategory: TourCategory;
  level?: number; // 카카오 확대 레벨 (숫자가 작을수록 확대)
};

export function buildKakaoMapHtml({
  center,
  myLocation,
  initialCategory,
  level = 4,
}: Options) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<style>
  html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden;
    background:#f3efe7; -webkit-tap-highlight-color: transparent; }
  /* touch-action:none — 두 손가락 제스처를 브라우저가 가로채지 않고 지도 SDK 로 그대로
     넘겨줍니다. 이게 없으면 웹뷰 안에서 핀치 확대/축소가 먹지 않는 경우가 있습니다. */
  #map { width:100%; height:100%; touch-action:none; }

  /* ── 커스텀 마커 (물방울 핀) ──
     원+꼬리+그림자를 div 3개로 조립하던 것을 SVG 한 장으로 바꿨습니다.
     꼬리가 끝으로 갈수록 좁아져 좌표를 정확히 가리키고, 그림자는 CSS
     drop-shadow 가 실제 모양을 따라 그립니다(예전엔 타원 하나를 띄워 뒀습니다). */
  .pin { width:32px; height:44px; cursor:pointer;
    transition: transform .18s cubic-bezier(.2,.9,.3,1.15); transform-origin:50% 100%; }
  .pin.on { transform: scale(1.22); }
  .pin svg { display:block; width:32px; height:44px;
    filter: drop-shadow(0 3px 4px rgba(0,0,0,.3)); }

  /* ── 검색 결과 마커 (번호 핀) ── */
  .spin { width:30px; height:41px; cursor:pointer;
    transition: transform .18s cubic-bezier(.2,.9,.3,1.15); transform-origin:50% 100%; }
  .spin.on { transform: scale(1.22); }
  .spin svg { display:block; width:30px; height:41px;
    filter: drop-shadow(0 3px 4px rgba(0,0,0,.32)); }
  .spin .drop { fill:#d8a84e; }
  .spin.on .drop { fill:#1b2233; }
  .spin text { font:700 13px -apple-system, BlinkMacSystemFont,
    'Apple SD Gothic Neo', sans-serif; }
  .safety-pin { width:30px; height:30px; cursor:pointer; border-radius:9px;
    display:flex; align-items:center; justify-content:center; color:#fff;
    border:2px solid #fff; box-sizing:border-box; font:700 12px -apple-system,
    BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif;
    box-shadow:0 3px 6px rgba(0,0,0,.3); transform-origin:50% 50%;
    transition:transform .16s ease; }
  .safety-pin.on { transform:scale(1.22); }

  /* ── 현위치 파란 점 ── */
  .me { position:relative; width:20px; height:20px; }
  .me-dot { position:absolute; inset:0; border-radius:50%; background:#2563eb;
    border:3px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,.3); }
  .me-halo { position:absolute; left:50%; top:50%; width:44px; height:44px; margin:-22px 0 0 -22px;
    border-radius:50%; background:rgba(37,99,235,.18); animation:pulse 2.2s ease-out infinite; }
  @keyframes pulse {
    0%   { transform:scale(.5); opacity:.9; }
    100% { transform:scale(1);  opacity:0;  }
  }

  /* SDK 로드 실패 안내 */
  #fallback { display:none; position:absolute; inset:0; padding:24px; box-sizing:border-box;
    align-items:center; justify-content:center; text-align:center; color:#6b7280;
    font:14px/1.6 -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif; }
</style>
</head>
<body>
<div id="map"></div>
<div id="fallback">지도를 불러오지 못했습니다.<br />JavaScript 키와 플랫폼 도메인 등록을 확인해 주세요.</div>

<script>
  // 마커는 관광정보 API 응답이 온 뒤 __setPlaces 로 채워집니다.
  var PLACES = [];
  var CENTER = ${JSON.stringify(center)};
  var ME = ${JSON.stringify(myLocation)};
  var LEVEL = ${level};
  var MIN_LEVEL = 1;   // 최대 확대
  var MAX_LEVEL = 14;  // 최대 축소
  var INITIAL_CATEGORY = ${JSON.stringify(initialCategory)};

  function send(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }
  // 웹뷰 안에서 난 에러도 RN 콘솔에서 볼 수 있게 넘깁니다.
  window.onerror = function (message) { send({ type: 'error', message: String(message) }); };

  /**
   * 카테고리별 글리프 — 필터 칩과 똑같은 그림을 쓰도록 phosphor(fill weight) 의
   * 원본 path 를 그대로 옮겨왔습니다. 원본 viewBox 가 256 이라 핀 안에서는
   * 0.0586 배(=15px)로 줄여 원 중앙에 맞춥니다.
   */
  var GLYPHS = {
    attraction:
      'm254.88 195.92-54.56-92.08A15.87 15.87 0 0 0 186.55 96a15.85 15.85 0 0 0-13.76 7.84l-15.64 26.39a4 4 0 0 0 0 4.07l26.8 45.47a8.13 8.13 0 0 1-1.89 10.55 8 8 0 0 1-11.8-2.26L101.79 71.88a16 16 0 0 0-27.58 0L1.11 195.94a8 8 0 0 0 1 9.52A8.23 8.23 0 0 0 8.23 208h239.54a8.3 8.3 0 0 0 6.09-2.55 8 8 0 0 0 1.02-9.53M64.43 120 88 80l23.57 40ZM140 52a24 24 0 1 1 24 24 24 24 0 0 1-24-24',
    culture:
      'M248 208a8 8 0 0 1-8 8H16a8 8 0 0 1 0-16h224a8 8 0 0 1 8 8M16.3 98.18a8 8 0 0 1 3.51-9l104-64a8 8 0 0 1 8.38 0l104 64A8 8 0 0 1 232 104h-24v64h16a8 8 0 0 1 0 16H32a8 8 0 0 1 0-16h16v-64H24a8 8 0 0 1-7.7-5.82M144 160a8 8 0 0 0 16 0v-48a8 8 0 0 0-16 0Zm-48 0a8 8 0 0 0 16 0v-48a8 8 0 0 0-16 0Z',
    festival:
      'M111.49 52.63a15.8 15.8 0 0 0-26 5.77L33 202.78A15.83 15.83 0 0 0 47.76 224a16 16 0 0 0 5.46-1l144.37-52.5a15.8 15.8 0 0 0 5.78-26Zm-46.35 108.5 19.2-52.79 63.32 63.32-52.8 19.2ZM160 72a37.8 37.8 0 0 1 3.84-15.58C169.14 45.83 179.14 40 192 40c6.7 0 11-2.29 13.65-7.21a22 22 0 0 0 2.35-8.85 8 8 0 0 1 16 .06c0 12.86-8.52 32-32 32-6.7 0-11 2.29-13.65 7.21a22 22 0 0 0-2.35 8.85 8 8 0 0 1-16-.06m-24-32V16a8 8 0 0 1 16 0v24a8 8 0 0 1-16 0m101.66 82.34a8 8 0 1 1-11.32 11.31l-16-16a8 8 0 0 1 11.32-11.32Zm4.87-42.75-24 8a8 8 0 0 1-5.06-15.18l24-8a8 8 0 0 1 5.06 15.18',
    course:
      'M228 200a28 28 0 0 1-54.83 8H72a48 48 0 0 1 0-96h96a24 24 0 0 0 0-48H72a8 8 0 0 1 0-16h96a40 40 0 0 1 0 80H72a32 32 0 0 0 0 64h101.17a28 28 0 0 1 54.83 8',
    leports:
      'M120 56a32 32 0 1 1 32 32 32 32 0 0 1-32-32m103.28 74.08a8 8 0 0 0-10.6-4c-.25.12-26.71 10.72-72.18-20.19-52.29-35.54-88-7.77-89.51-6.57a8 8 0 1 0 10 12.48c.26-.21 25.12-19.5 64.07 3.27-4.25 13.35-12.76 31.82-25.25 47-18.56 22.48-41.11 32.56-67 30A8 8 0 0 0 31.2 208a92 92 0 0 0 9.34.47c27.38 0 52-12.38 71.63-36.18.57-.69 1.14-1.4 1.69-2.1C133.31 175.29 168 190.3 168 232a8 8 0 0 0 16 0c0-24.65-10.08-45.35-29.15-59.86a104.3 104.3 0 0 0-31.31-15.81A169.3 169.3 0 0 0 139 124c26.14 16.09 46.84 20 60.69 20 12.18 0 19.06-3 19.67-3.28a8 8 0 0 0 3.92-10.64',
    stay:
      'M216 72H32V48a8 8 0 0 0-16 0v160a8 8 0 0 0 16 0v-32h208v32a8 8 0 0 0 16 0v-96a40 40 0 0 0-40-40M32 88h72v72H32Z',
    shopping:
      'M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m-88 96a48.05 48.05 0 0 1-48-48 8 8 0 0 1 16 0 32 32 0 0 0 64 0 8 8 0 0 1 16 0 48.05 48.05 0 0 1-48 48',
    food:
      'M216 40v184a8 8 0 0 1-16 0v-48h-48a8 8 0 0 1-8-8 268.8 268.8 0 0 1 7.22-56.88c9.78-40.49 28.32-67.63 53.63-78.47A8 8 0 0 1 216 40m-96.11-1.31a8 8 0 1 0-15.78 2.63L111.89 88H88V40a8 8 0 0 0-16 0v48H48.11l7.78-46.68a8 8 0 1 0-15.78-2.63l-8 48A8 8 0 0 0 32 88a48.07 48.07 0 0 0 40 47.32V224a8 8 0 0 0 16 0v-88.68A48.07 48.07 0 0 0 128 88a8 8 0 0 0-.11-1.31Z',
  };

  /** 물방울 핀 윤곽 — 아래로 갈수록 좁아져 끝점이 좌표를 가리킵니다. */
  var PIN_PATH = 'M16 1.5c-8.008 0-14.5 6.492-14.5 14.5 0 10.5 14.5 26 14.5 26' +
    's14.5-15.5 14.5-26c0-8.008-6.492-14.5-14.5-14.5z';

  /** 번호 핀 윤곽 — 관광 핀보다 살짝 작습니다. */
  var SPIN_PATH = 'M15 1.4c-7.512 0-13.6 6.088-13.6 13.6 0 9.85 13.6 24.4 13.6 24.4' +
    's13.6-14.55 13.6-24.4c0-7.512-6.088-13.6-13.6-13.6z';

  function pinSvg(color, category) {
    var glyph = GLYPHS[category] || GLYPHS.attraction;
    return '<svg viewBox="0 0 32 44">' +
      '<path d="' + PIN_PATH + '" fill="' + color + '" stroke="#fff" stroke-width="2.5"/>' +
      '<g transform="translate(8.5 8.5) scale(0.0586)" fill="#fff">' +
        '<path d="' + glyph + '"/>' +
      '</g>' +
    '</svg>';
  }

  var meOverlay = null;      // 현위치 파란 점 (측위 결과가 오면 위치를 갱신)
  var overlays = {};         // id -> { overlay, el, category }
  var category = INITIAL_CATEGORY;  // 현재 필터. 마커를 다시 그릴 때 기준이 됩니다.
  var searchOverlays = {};   // 검색 결과 id -> { overlay, el }
  var safetyOverlays = {};   // 안전 장소 id -> { overlay, el }
  var selectedId = null;
  var selectedSearchId = null;
  var placesService = null;  // kakao.maps.services.Places
  var map = null;

  function makePin(place) {
    var el = document.createElement('div');
    el.className = 'pin';
    el.innerHTML = pinSvg(place.color, place.category);
    // 지도 드래그와 섞이지 않게 탭만 잡습니다.
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      send({ type: 'markerPress', id: place.id });
    });
    return el;
  }

  /** 기존 마커를 모두 걷어내고 PLACES 로 다시 그립니다. */
  function renderPlaces() {
    Object.keys(overlays).forEach(function (id) {
      overlays[id].overlay.setMap(null);
    });
    overlays = {};
    selectedId = null;

    if (!map) return;

    PLACES.forEach(function (place) {
      var el = makePin(place);
      var overlay = new kakao.maps.CustomOverlay({
        // 처음부터 해당 카테고리만 올려서 깜빡임을 없앱니다.
        map: place.category === category ? map : null,
        position: new kakao.maps.LatLng(place.lat, place.lng),
        content: el,
        yAnchor: 1,       // 핀 꼬리 끝이 좌표를 가리키도록
        clickable: true,  // 오버레이 안의 DOM 이벤트를 살립니다
      });
      overlays[place.id] = { overlay: overlay, el: el, category: place.category };
    });
  }

  function initMap() {
    map = new kakao.maps.Map(document.getElementById('map'), {
      center: new kakao.maps.LatLng(CENTER.lat, CENTER.lng),
      level: LEVEL,
    });

    // 키워드 검색용 서비스 (SDK URL 의 libraries=services 로 로드됩니다)
    placesService = new kakao.maps.services.Places();

    renderPlaces();

    // 현위치 점
    var meEl = document.createElement('div');
    meEl.className = 'me';
    meEl.innerHTML = '<div class="me-halo"></div><div class="me-dot"></div>';
    meOverlay = new kakao.maps.CustomOverlay({
      map: map,
      position: new kakao.maps.LatLng(ME.lat, ME.lng),
      content: meEl,
      yAnchor: 0.5,
    });

    // 빈 지도를 누르면 바텀시트를 닫습니다.
    kakao.maps.event.addListener(map, 'click', function () {
      send({ type: 'mapPress' });
    });

    /**
     * 지도 이동이 멎으면 새 중심을 알립니다.
     * RN 이 "이 지역에서 재검색" 버튼을 띄울지 판단하는 데 씁니다.
     * (idle 은 드래그·확대가 끝난 뒤 한 번만 오므로 요청이 남발되지 않습니다.)
     */
    function sendViewport() {
      var c = map.getCenter();
      var bounds = map.getBounds();
      var sw = bounds.getSouthWest();
      var ne = bounds.getNorthEast();
      send({
        type: 'centerChanged',
        lat: c.getLat(),
        lng: c.getLng(),
        south: sw.getLat(),
        west: sw.getLng(),
        north: ne.getLat(),
        east: ne.getLng(),
        level: map.getLevel()
      });
    }

    kakao.maps.event.addListener(map, 'idle', sendViewport);

    send({ type: 'ready' });
    sendViewport();
  }

  /* ── RN 에서 호출하는 전역 함수들 ── */

  /** 관광정보 API 결과로 마커를 통째로 교체합니다. */
  window.__setPlaces = function (list) {
    PLACES = Array.isArray(list) ? list : [];
    renderPlaces();
  };

  window.__setCategory = function (next) {
    category = next;
    Object.keys(overlays).forEach(function (id) {
      var item = overlays[id];
      item.overlay.setMap(item.category === next ? map : null);
    });
  };

  window.__selectPlace = function (id) {
    if (selectedId && overlays[selectedId]) {
      overlays[selectedId].el.classList.remove('on');
    }
    selectedId = id;
    if (id && overlays[id]) {
      overlays[id].el.classList.add('on');
      // 바텀시트에 가리지 않도록 살짝 위로 올려 중심에 둡니다.
      map.panTo(overlays[id].overlay.getPosition());
    }
  };

  window.__setSafetyPlaces = function (list) {
    Object.keys(safetyOverlays).forEach(function (id) {
      safetyOverlays[id].overlay.setMap(null);
    });
    safetyOverlays = {};
    if (!map || !Array.isArray(list)) return;
    list.forEach(function (place) {
      var el = document.createElement('div');
      el.className = 'safety-pin';
      el.style.backgroundColor = place.color;
      el.textContent = place.glyph;
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        send({ type: 'safetyMarkerPress', id: place.id });
      });
      var overlay = new kakao.maps.CustomOverlay({
        map: map,
        position: new kakao.maps.LatLng(place.lat, place.lng),
        content: el,
        yAnchor: .5,
        zIndex: 4,
        clickable: true,
      });
      safetyOverlays[place.id] = { overlay: overlay, el: el };
    });
  };

  window.__selectSafetyPlace = function (id) {
    Object.keys(safetyOverlays).forEach(function (key) {
      safetyOverlays[key].el.classList.toggle('on', key === id);
    });
    if (id && safetyOverlays[id]) map.panTo(safetyOverlays[id].overlay.getPosition());
  };

  window.__moveToMyLocation = function () {
    if (map) { map.panTo(new kakao.maps.LatLng(ME.lat, ME.lng)); }
  };

  /** 측위 결과를 받아 현위치 점을 옮깁니다. (RN 의 useCurrentLocation 훅이 호출) */
  window.__setMyLocation = function (lat, lng) {
    ME = { lat: lat, lng: lng };
    if (meOverlay) { meOverlay.setPosition(new kakao.maps.LatLng(lat, lng)); }
  };

  /**
   * 카카오 확대 레벨은 숫자가 작을수록 확대입니다 (1=최대 확대, 14=최대 축소).
   * 범위를 벗어난 값을 넣으면 아무 반응이 없어서 여기서 직접 잘라 줍니다.
   */
  function setLevelClamped(next) {
    if (!map) return;
    var level = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, next));
    if (level === map.getLevel()) return;
    map.setLevel(level, { animate: true });
  }

  window.__zoomIn = function () { setLevelClamped(map ? map.getLevel() - 1 : LEVEL); };
  window.__zoomOut = function () { setLevelClamped(map ? map.getLevel() + 1 : LEVEL); };

  window.__moveTo = function (lat, lng, level) {
    if (!map) return;
    if (typeof level === 'number') { map.setLevel(level); }
    map.panTo(new kakao.maps.LatLng(lat, lng));
  };

  /* ── 카카오 장소 키워드 검색 ── */

  // SDK 응답에서 필요한 필드만 골라 RN 으로 넘깁니다.
  function toItem(d) {
    return {
      id: d.id,
      name: d.place_name,
      address: d.address_name || '',
      roadAddress: d.road_address_name || '',
      category: d.category_group_name || (d.category_name || '').split('>').pop().trim(),
      phone: d.phone || '',
      url: d.place_url || '',
      distance: d.distance ? Number(d.distance) : null,
      lat: Number(d.y),
      lng: Number(d.x),
    };
  }

  /**
   * 1차는 현재 지도 중심 20km 안에서 가까운 순으로 찾고,
   * 결과가 없으면 지역 제한을 풀고 전국에서 한 번 더 찾습니다.
   * (예: 단양에서 지도를 보다가 '부산 해운대' 를 검색하는 경우)
   */
  window.__search = function (query, reqId) {
    if (!placesService) {
      send({ type: 'searchResult', reqId: reqId, items: [], status: 'ERROR' });
      return;
    }
    var c = map ? map.getCenter() : new kakao.maps.LatLng(CENTER.lat, CENTER.lng);

    function reply(items, status) {
      send({ type: 'searchResult', reqId: reqId, items: items, status: status });
    }

    placesService.keywordSearch(query, function (data, status) {
      if (status === kakao.maps.services.Status.OK && data.length) {
        reply(data.map(toItem), 'OK');
        return;
      }
      // 주변에 없으면 전국 검색으로 재시도
      placesService.keywordSearch(query, function (data2, status2) {
        if (status2 === kakao.maps.services.Status.OK) {
          reply(data2.map(toItem), 'OK');
        } else if (status2 === kakao.maps.services.Status.ZERO_RESULT) {
          reply([], 'ZERO_RESULT');
        } else {
          reply([], 'ERROR');
        }
      }, { size: 15 });
    }, {
      location: c,
      radius: 20000,
      size: 15,
      sort: kakao.maps.services.SortBy.DISTANCE,
    });
  };

  function makeSearchPin(item, index) {
    var el = document.createElement('div');
    el.className = 'spin';
    el.innerHTML =
      '<svg viewBox="0 0 30 41">' +
        '<path class="drop" d="' + SPIN_PATH + '" stroke="#fff" stroke-width="2.4"/>' +
        '<text x="15" y="15" dy="0.36em" text-anchor="middle" fill="#fff">' +
          (index + 1) +
        '</text>' +
      '</svg>';
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      send({ type: 'searchMarkerPress', id: item.id });
    });
    return el;
  }

  window.__clearSearchMarkers = function () {
    Object.keys(searchOverlays).forEach(function (id) {
      searchOverlays[id].overlay.setMap(null);
    });
    searchOverlays = {};
    selectedSearchId = null;
  };

  window.__showSearchMarkers = function (items, fit) {
    if (!map) return;
    window.__clearSearchMarkers();

    var bounds = new kakao.maps.LatLngBounds();
    items.forEach(function (item, index) {
      var pos = new kakao.maps.LatLng(item.lat, item.lng);
      var el = makeSearchPin(item, index);
      var overlay = new kakao.maps.CustomOverlay({
        map: map,
        position: pos,
        content: el,
        yAnchor: 1,
        zIndex: 5,       // 카테고리 마커 위에 그립니다
        clickable: true,
      });
      searchOverlays[item.id] = { overlay: overlay, el: el };
      bounds.extend(pos);
    });

    if (fit && items.length) {
      if (items.length === 1) {
        map.setLevel(3);
        map.setCenter(new kakao.maps.LatLng(items[0].lat, items[0].lng));
      } else {
        map.setBounds(bounds, 90, 40, 260, 40); // 상단 검색바·하단 카드 자리를 비워 둡니다
      }
    }
  };

  window.__selectSearchMarker = function (id) {
    if (selectedSearchId && searchOverlays[selectedSearchId]) {
      searchOverlays[selectedSearchId].el.classList.remove('on');
    }
    selectedSearchId = id;
    if (id && searchOverlays[id]) {
      searchOverlays[id].el.classList.add('on');
      map.panTo(searchOverlays[id].overlay.getPosition());
    }
  };

  /* ── SDK 로드 ── */
  var script = document.createElement('script');
  script.src =
    'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false&libraries=services';
  script.onload = function () {
    kakao.maps.load(initMap);
  };
  script.onerror = function () {
    document.getElementById('fallback').style.display = 'flex';
    send({ type: 'error', message: 'Kakao SDK 스크립트를 불러오지 못했습니다.' });
  };
  document.head.appendChild(script);
</script>
</body>
</html>`;
}
