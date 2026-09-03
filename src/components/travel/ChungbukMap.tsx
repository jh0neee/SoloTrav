import React, { useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
} from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import {
  CHUNGBUK_MAP_REGIONS,
  type ChungbukMapRegion,
} from '../../data/chungbukMapPaths';
import { colors } from '../../theme/colors';

type Props = {
  selectedCityId: string | null;
  onSelectCity: (cityId: string) => void;
  /** 지정하면 이 지역만 선택할 수 있고 나머지는 배경 지도로 흐리게 보입니다. */
  selectableCityIds?: readonly string[];
  /** 선택 여부와 별개로 의미를 강조할 지역들입니다. */
  highlightedCityIds?: readonly string[];
  height?: number;
};

const UNSELECTED_FILL = '#e9edf2';
const LABEL_COLOR = '#667085';
const SELECTED_LABEL_COLOR = '#f8fafc';
const JEUNGPYEONG_CENTER = { x: 192.6, y: 342.9 };
const JEUNGPYEONG_SCALE = 1.35;
const SELECTED_OFFSET_Y = -7;
const SHADOW_OFFSET_Y = 4;
const MAP_VIEW_BOX = { minX: -12, minY: -20, width: 824, height: 943 };

function scalePathFromCenter(
  path: string,
  centerX: number,
  centerY: number,
  scale: number,
) {
  let coordinateIndex = 0;

  return path.replace(/-?\d+(?:\.\d+)?/g, value => {
    const coordinate = Number(value);
    const center = coordinateIndex % 2 === 0 ? centerX : centerY;
    coordinateIndex += 1;
    return (center + (coordinate - center) * scale).toFixed(2);
  });
}

function offsetPathVertically(path: string, offsetY: number) {
  let coordinateIndex = 0;

  return path.replace(/-?\d+(?:\.\d+)?/g, value => {
    const coordinate = Number(value);
    const positionedCoordinate =
      coordinateIndex % 2 === 0 ? coordinate : coordinate + offsetY;
    coordinateIndex += 1;
    return positionedCoordinate.toFixed(2);
  });
}

function getRegionPaths(region: ChungbukMapRegion, selected: boolean) {
  const displayPaths =
    region.id === 'jeungpyeong'
      ? region.paths.map(path =>
          scalePathFromCenter(
            path,
            JEUNGPYEONG_CENTER.x,
            JEUNGPYEONG_CENTER.y,
            JEUNGPYEONG_SCALE,
          ),
        )
      : region.paths;

  return selected
    ? displayPaths.map(path => offsetPathVertically(path, SELECTED_OFFSET_Y))
    : displayPaths;
}

function pathContainsPoint(path: string, x: number, y: number) {
  const coordinates = Array.from(
    path.matchAll(/-?\d+(?:\.\d+)?/g),
    match => Number(match[0]),
  );
  let inside = false;

  for (
    let current = 0, previous = coordinates.length - 2;
    current < coordinates.length;
    previous = current, current += 2
  ) {
    const currentX = coordinates[current];
    const currentY = coordinates[current + 1];
    const previousX = coordinates[previous];
    const previousY = coordinates[previous + 1];
    const crosses =
      currentY > y !== previousY > y &&
      x <
        ((previousX - currentX) * (y - currentY)) /
          (previousY - currentY) +
          currentX;

    if (crosses) {
      inside = !inside;
    }
  }

  return inside;
}

/** 실제 충북 시·군 경계를 사용하는 선택형 지도입니다. */
export function ChungbukMap({
  selectedCityId,
  onSelectCity,
  selectableCityIds,
  highlightedCityIds,
  height = 380,
}: Props) {
  const mapSizeRef = useRef({ width: 0, height });
  const selectedRegion = CHUNGBUK_MAP_REGIONS.find(
    region => region.id === selectedCityId,
  );
  const unselectedRegions = CHUNGBUK_MAP_REGIONS.filter(
    region => region.id !== selectedCityId,
  ).sort(
    (a, b) =>
      Number(a.id === 'jeungpyeong') - Number(b.id === 'jeungpyeong'),
  );
  const orderedRegions = selectedRegion
    ? [...unselectedRegions, selectedRegion]
    : unselectedRegions;

  const handleMapPress = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const { width, height: measuredHeight } = mapSizeRef.current;
    const scale = Math.min(
      width / MAP_VIEW_BOX.width,
      measuredHeight / MAP_VIEW_BOX.height,
    );
    const offsetX = (width - MAP_VIEW_BOX.width * scale) / 2;
    const offsetY = (measuredHeight - MAP_VIEW_BOX.height * scale) / 2;
    const mapX = (locationX - offsetX) / scale + MAP_VIEW_BOX.minX;
    const mapY = (locationY - offsetY) / scale + MAP_VIEW_BOX.minY;

    const pressedRegion = [...orderedRegions].reverse().find(region =>
      getRegionPaths(region, region.id === selectedCityId).some(path =>
        pathContainsPoint(path, mapX, mapY),
      ),
    );

    if (
      pressedRegion &&
      (!selectableCityIds || selectableCityIds.includes(pressedRegion.id))
    ) {
      onSelectCity(pressedRegion.id);
    }
  };

  return (
    <Pressable
      style={[styles.container, { height }]}
      onPress={handleMapPress}
      onLayout={event => {
        mapSizeRef.current = event.nativeEvent.layout;
      }}>
      <Svg
        width="100%"
        height="100%"
        viewBox="-12 -20 824 943"
        pointerEvents="none">
        {orderedRegions.map(region => (
          <MapRegion
            key={region.id}
            region={region}
            selected={region.id === selectedCityId}
            highlighted={highlightedCityIds?.includes(region.id) ?? false}
          />
        ))}
        {CHUNGBUK_MAP_REGIONS.map(region => (
          <MapLabel
            key={`label-${region.id}`}
            region={region}
            selected={region.id === selectedCityId}
            highlighted={highlightedCityIds?.includes(region.id) ?? false}
          />
        ))}
      </Svg>
    </Pressable>
  );
}

function MapRegion({
  region,
  selected,
  highlighted,
}: {
  region: ChungbukMapRegion;
  selected: boolean;
  highlighted: boolean;
}) {
  const fill = selected
    ? colors.primary
    : highlighted
    ? colors.primarySoft
    : UNSELECTED_FILL;
  const isCheongju = region.id === 'cheongju';
  const isJeungpyeong = region.id === 'jeungpyeong';
  const displayPaths = isJeungpyeong
    ? region.paths.map(path =>
        scalePathFromCenter(
          path,
          JEUNGPYEONG_CENTER.x,
          JEUNGPYEONG_CENTER.y,
          JEUNGPYEONG_SCALE,
        ),
      )
    : region.paths;
  const positionedPaths = getRegionPaths(region, selected);
  const shadowPaths = selected
    ? displayPaths.map(path => offsetPathVertically(path, SHADOW_OFFSET_Y))
    : [];

  return (
    <G pointerEvents="none">
      <G>
        {selected
          ? shadowPaths.map((path, index) => (
              <Path
                key={`shadow-${region.id}-${index}`}
                d={path}
                fill="rgba(22, 24, 29, 0.16)"
              />
            ))
          : null}
        {positionedPaths.map((path, index) => (
          <Path
            key={`${region.id}-${index}`}
            d={path}
            fill={fill}
            stroke="#ffffff"
            strokeWidth={isCheongju ? 6 : 3}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {isCheongju
          ? positionedPaths.map((path, index) => (
              <Path
                key={`merged-${region.id}-${index}`}
                d={path}
                fill={fill}
                stroke="none"
              />
            ))
          : null}
      </G>
    </G>
  );
}

function MapLabel({
  region,
  selected,
  highlighted,
}: {
  region: ChungbukMapRegion;
  selected: boolean;
  highlighted: boolean;
}) {
  const isJeungpyeong = region.id === 'jeungpyeong';
  const labelY = region.labelY + (selected ? SELECTED_OFFSET_Y : 0);
  const labelColor = selected
    ? SELECTED_LABEL_COLOR
    : highlighted
    ? colors.primary
    : LABEL_COLOR;

  return (
    <G pointerEvents="none">
      {isJeungpyeong ? (
        <>
          <SvgText
            x={region.labelX}
            y={labelY - 3}
            fill={labelColor}
            fontSize={24}
            fontWeight="500"
            textAnchor="middle">
            증
          </SvgText>
          <SvgText
            x={region.labelX}
            y={labelY + 23}
            fill={labelColor}
            fontSize={24}
            fontWeight="500"
            textAnchor="middle">
            평
          </SvgText>
        </>
      ) : (
        <SvgText
          x={region.labelX}
          y={labelY + 10}
          fill={labelColor}
          fontSize={30}
          fontWeight="500"
          textAnchor="middle">
          {region.name}
        </SvgText>
      )}
    </G>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 380,
  },
});
