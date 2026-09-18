import React, { useCallback, useState, useSyncExternalStore } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ImageStyle,
  type ImageResizeMode,
} from 'react-native';
import { mediaIdFromUrl } from '../api/mediaApi';
import { isScanReady, mediaScanStore } from '../media/mediaScanStore';
import { colors } from '../theme/colors';

type Props = {
  uri: string;
  ownerId?: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  fallback?: React.ReactNode;
  showNotice?: boolean;
};

export default function RecordImage(props: Props) {
  const id = mediaIdFromUrl(props.uri);
  return id ? (
    <ScannedImage key={props.uri} {...props} id={id} />
  ) : (
    <DirectImage key={props.uri} {...props} />
  );
}

function DirectImage({ uri, style, resizeMode, fallback }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <View style={[style, styles.notice]}>
        <Text style={styles.text}>사진을 불러오지 못했어요</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

function ScannedImage({
  id,
  uri,
  style,
  resizeMode,
  fallback,
  showNotice,
}: Props & { id: string }) {
  const subscribe = useCallback(
    (listener: () => void) => mediaScanStore.subscribe(id, listener),
    [id],
  );
  const get = useCallback(() => mediaScanStore.get(id), [id]);
  const state = useSyncExternalStore(subscribe, get);

  // 검사를 통과(CLEAN)한 사진만 보여줍니다.
  if (isScanReady(state.status)) {
    return (
      <DirectImage
        uri={uri}
        style={style}
        resizeMode={resizeMode}
        fallback={fallback}
      />
    );
  }

  // 작성/수정 화면 등에서 명시적으로 상태 안내가 필요한 경우
  if (showNotice) {
    const isBlocked = ['INFECTED', 'BLOCKED', 'REJECTED'].includes(
      state.status.toUpperCase(),
    );
    return (
      <View style={[style, styles.notice]}>
        <Text style={styles.text}>
          {isBlocked ? '차단된 사진' : '검사 대기 중'}
        </Text>
      </View>
    );
  }

  // 일반 게시물 조회 시에는 검사를 통과하지 않은 사진은 표시하지 않습니다.
  return fallback ? <>{fallback}</> : null;
}

const styles = StyleSheet.create({
  notice: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#f1f5f9',
  },
  text: { color: colors.textSecondary, fontSize: 12, textAlign: 'center' },
});
