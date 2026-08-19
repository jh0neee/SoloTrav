/**
 * Solo Travel Mate
 * 혼자 여행하는 사람을 위한 안전한 여행 가이드
 *
 * @format
 */

import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import { colors } from './src/theme/colors';

function App() {
  return (
    <SafeAreaProvider>
      {/*
        상태바를 투명하게 두고 화면이 그 아래까지 그려지게 합니다(카카오맵과 동일).
        상단 여백은 각 화면이 useSafeAreaInsets 로 직접 처리합니다.
      */}
      <View style={styles.root}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <BottomTabNavigator />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default App;
