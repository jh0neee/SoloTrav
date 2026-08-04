/**
 * WebView 에 주입할 카카오맵 HTML 문자열을 만듭니다.
 *
 * 마커는 kakao.maps.Marker(이미지 기반) 가 아니라 **CustomOverlay** 를 씁니다.
 * CustomOverlay 는 임의의 DOM 을 그대로 지도 위에 올려주기 때문에,
 * 방패 핀·그림자·선택 애니메이션을 전부 CSS 로 표현할 수 있습니다.
 *
 * 통신 규약
 *  - Web → RN : window.ReactNativeWebView.postMessage(JSON)
 *      { type: 'ready' }                  지도 로드 완료
 *      { type: 'markerPress', id }        마커 탭
 *      { type: 'mapPress' }               빈 지도 탭 (시트 닫기용)
 *      { type: 'error', message }         SDK 로드 실패 등
 *  - RN → Web : injectJavaScript 로 아래 전역 함수 호출
 *      window.__setCategory(category)     카테고리 필터 변경
 *      window.__selectPlace(id | null)    선택 마커 강조
 *      window.__moveToMyLocation()        현위치로 이동
 */
import { KAKAO_JS_KEY } from '../../config/kakao';
import type { Place, PlaceCategory } from '../../data/places';

/** 카테고리별 마커 색상 */
const CATEGORY_COLOR: Record<PlaceCategory, string> = {
  safe: '#3d8a5a',
  solo: '#3b4557',
  review: '#d8a84e',
};

type Options = {
  places: Place[];
  center: { lat: number; lng: number };
  myLocation: { lat: number; lng: number };
  /** 처음 보여 줄 카테고리. 전체가 잠깐 떴다 사라지는 깜빡임을 막습니다. */
  initialCategory: PlaceCategory;
  level?: number; // 카카오 확대 레벨 (숫자가 작을수록 확대)
};

export function buildKakaoMapHtml({
  places,
  center,
  myLocation,
  initialCategory,
  level = 4,
}: Options) {
  // 좌표·이름만 넘기면 되므로 리뷰 등 무거운 필드는 제외합니다.
  const markerData = places.map(p => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    category: p.category,
    color: CATEGORY_COLOR[p.category],
  }));

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<style>
  html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden;
    background:#f3efe7; -webkit-tap-highlight-color: transparent; }
  #map { width:100%; height:100%; }

  /* ── 커스텀 마커 (방패 핀) ── */
  .pin { position:relative; width:34px; height:34px; cursor:pointer;
    transition: transform .18s ease; transform-origin: 50% 120%; }
  .pin.on { transform: scale(1.18); }
  .pin-body { position:relative; z-index:2; width:34px; height:34px; box-sizing:border-box;
    border-radius:50%; border:2.5px solid #fff; display:flex; align-items:center;
    justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,.28); }
  .pin-tail { position:absolute; z-index:1; left:50%; top:25px; width:11px; height:11px;
    transform:translateX(-50%) rotate(45deg); border-radius:0 0 3px 0;
    border-right:2.5px solid #fff; border-bottom:2.5px solid #fff; }
  .pin-shadow { position:absolute; z-index:0; left:50%; top:40px; width:20px; height:6px;
    transform:translateX(-50%); border-radius:50%; background:rgba(40,40,40,.26); }
  .pin svg { width:15px; height:15px; display:block; }

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
  var PLACES = ${JSON.stringify(markerData)};
  var CENTER = ${JSON.stringify(center)};
  var ME = ${JSON.stringify(myLocation)};
  var LEVEL = ${level};
  var INITIAL_CATEGORY = ${JSON.stringify(initialCategory)};

  function send(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }
  // 웹뷰 안에서 난 에러도 RN 콘솔에서 볼 수 있게 넘깁니다.
  window.onerror = function (message) { send({ type: 'error', message: String(message) }); };

  var SHIELD_SVG =
    '<svg viewBox="0 0 24 24" fill="none">' +
    '<path d="M12 2.6 4.8 5.6v5.9c0 4.6 3 8.4 7.2 9.9 4.2-1.5 7.2-5.3 7.2-9.9V5.6L12 2.6Z" fill="#fff"/>' +
    '<path d="m8.7 12.1 2.3 2.3 4.3-4.6" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var overlays = {};   // id -> { overlay, el, category }
  var selectedId = null;
  var map = null;

  function makePin(place) {
    var el = document.createElement('div');
    el.className = 'pin';
    el.innerHTML =
      '<div class="pin-shadow"></div>' +
      '<div class="pin-tail" style="background:' + place.color + '"></div>' +
      '<div class="pin-body" style="background:' + place.color + ';color:' + place.color + '">' +
        SHIELD_SVG +
      '</div>';
    // 지도 드래그와 섞이지 않게 탭만 잡습니다.
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      send({ type: 'markerPress', id: place.id });
    });
    return el;
  }

  function initMap() {
    map = new kakao.maps.Map(document.getElementById('map'), {
      center: new kakao.maps.LatLng(CENTER.lat, CENTER.lng),
      level: LEVEL,
    });

    PLACES.forEach(function (place) {
      var el = makePin(place);
      var overlay = new kakao.maps.CustomOverlay({
        // 처음부터 해당 카테고리만 올려서 깜빡임을 없앱니다.
        map: place.category === INITIAL_CATEGORY ? map : null,
        position: new kakao.maps.LatLng(place.lat, place.lng),
        content: el,
        yAnchor: 1,       // 핀 꼬리 끝이 좌표를 가리키도록
        clickable: true,  // 오버레이 안의 DOM 이벤트를 살립니다
      });
      overlays[place.id] = { overlay: overlay, el: el, category: place.category };
    });

    // 현위치 점
    var meEl = document.createElement('div');
    meEl.className = 'me';
    meEl.innerHTML = '<div class="me-halo"></div><div class="me-dot"></div>';
    new kakao.maps.CustomOverlay({
      map: map,
      position: new kakao.maps.LatLng(ME.lat, ME.lng),
      content: meEl,
      yAnchor: 0.5,
    });

    // 빈 지도를 누르면 바텀시트를 닫습니다.
    kakao.maps.event.addListener(map, 'click', function () {
      send({ type: 'mapPress' });
    });

    send({ type: 'ready' });
  }

  /* ── RN 에서 호출하는 전역 함수들 ── */

  window.__setCategory = function (category) {
    Object.keys(overlays).forEach(function (id) {
      var item = overlays[id];
      item.overlay.setMap(item.category === category ? map : null);
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

  window.__moveToMyLocation = function () {
    if (map) { map.panTo(new kakao.maps.LatLng(ME.lat, ME.lng)); }
  };

  /* ── SDK 로드 ── */
  var script = document.createElement('script');
  script.src =
    'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false';
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
