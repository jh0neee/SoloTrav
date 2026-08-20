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
 *      { type: 'searchResult', reqId, items }  키워드 검색 응답
 *      { type: 'error', message }              SDK 로드 실패 등
 *  - RN → Web : injectJavaScript 로 아래 전역 함수 호출
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
  /* touch-action:none — 두 손가락 제스처를 브라우저가 가로채지 않고 지도 SDK 로 그대로
     넘겨줍니다. 이게 없으면 웹뷰 안에서 핀치 확대/축소가 먹지 않는 경우가 있습니다. */
  #map { width:100%; height:100%; touch-action:none; }

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

  /* ── 검색 결과 마커 (번호 핀) ── */
  .spin { position:relative; width:30px; height:30px; cursor:pointer;
    transition: transform .18s ease; transform-origin: 50% 120%; }
  .spin.on { transform: scale(1.22); }
  .spin-body { position:relative; z-index:2; width:30px; height:30px; box-sizing:border-box;
    border-radius:50%; border:2.5px solid #fff; background:#d8a84e; color:#fff;
    font:700 13px/1 -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 3px 8px rgba(0,0,0,.3); }
  .spin.on .spin-body { background:#1b2233; }
  .spin-tail { position:absolute; z-index:1; left:50%; top:22px; width:10px; height:10px;
    transform:translateX(-50%) rotate(45deg); border-radius:0 0 3px 0; background:#d8a84e;
    border-right:2.5px solid #fff; border-bottom:2.5px solid #fff; }
  .spin.on .spin-tail { background:#1b2233; }
  .spin-shadow { position:absolute; z-index:0; left:50%; top:36px; width:18px; height:6px;
    transform:translateX(-50%); border-radius:50%; background:rgba(40,40,40,.26); }

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

  var SHIELD_SVG =
    '<svg viewBox="0 0 24 24" fill="none">' +
    '<path d="M12 2.6 4.8 5.6v5.9c0 4.6 3 8.4 7.2 9.9 4.2-1.5 7.2-5.3 7.2-9.9V5.6L12 2.6Z" fill="#fff"/>' +
    '<path d="m8.7 12.1 2.3 2.3 4.3-4.6" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var meOverlay = null;      // 현위치 파란 점 (측위 결과가 오면 위치를 갱신)
  var overlays = {};         // id -> { overlay, el, category }
  var searchOverlays = {};   // 검색 결과 id -> { overlay, el }
  var selectedId = null;
  var selectedSearchId = null;
  var placesService = null;  // kakao.maps.services.Places
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

    // 키워드 검색용 서비스 (SDK URL 의 libraries=services 로 로드됩니다)
    placesService = new kakao.maps.services.Places();

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
      '<div class="spin-shadow"></div>' +
      '<div class="spin-tail"></div>' +
      '<div class="spin-body">' + (index + 1) + '</div>';
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
