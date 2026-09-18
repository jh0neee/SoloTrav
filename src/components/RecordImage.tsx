import React, { useCallback, useState, useSyncExternalStore } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ImageStyle,
  type ImageResizeMode,
} from 'react-native';
import { mediaIdFromUrl } from '../api/mediaApi';
import {
  isScanPending,
  isScanReady,
  mediaScanStore,
} from '../media/mediaScanStore';
import { colors } from '../theme/colors';

type Props = {
  uri: string;
  ownerId?: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
};

export default function RecordImage(props: Props) {
  const id = mediaIdFromUrl(props.uri);
  return id ? (
    <ScannedImage key={props.uri} {...props} id={id} />
  ) : (
    <DirectImage key={props.uri} {...props} />
  );
}

function DirectImage({ uri, style, resizeMode }: Props) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <View style={[style, styles.notice]}>
      <Text style={styles.text}>사진을 불러오지 못했어요</Text>
    </View>
  ) : (
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
  ownerId,
  style,
  resizeMode,
}: Props & { id: string }) {
  const subscribe = useCallback(
    (listener: () => void) => mediaScanStore.subscribe(id, listener, ownerId),
    [id, ownerId],
  );
  const get = useCallback(() => mediaScanStore.get(id), [id]);
  const state = useSyncExternalStore(subscribe, get);
  if (isScanReady(state.status))
    return <DirectImage uri={uri} style={style} resizeMode={resizeMode} />;
  const pending =
    (isScanPending(state.status) || state.retrying) && !state.message;
  const message =
    state.message ??
    (state.retrying
      ? '파일 검사 재시도 중'
      : pending
      ? '파일 검사 중'
      : state.status === 'ERROR'
      ? '파일 검사에 실패했어요'
      : ['INFECTED', 'BLOCKED', 'REJECTED'].includes(state.status)
      ? '표시할 수 없는 사진이에요'
      : '사진 검사 상태를 확인할 수 없어요');
  return (
    <View style={[style, styles.notice]} accessibilityLiveRegion="polite">
      {pending ? <ActivityIndicator color={colors.primary} /> : null}
      <Text style={styles.text}>{message}</Text>
      {!pending ? (
        <Pressable
          accessibilityRole="button"
          onPress={event => {
            event.stopPropagation();
            mediaScanStore.recheck(id);
          }}
          style={styles.retry}
        >
          <Text style={styles.retryText}>상태 다시 확인</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 8,
  },
  text: { color: colors.textSecondary, fontSize: 12, textAlign: 'center' },
  retry: { padding: 8, minHeight: 40, justifyContent: 'center' },
  retryText: { color: colors.primary, fontSize: 12, textAlign: 'center' },
});
