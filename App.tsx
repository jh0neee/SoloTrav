/**
 * Solo Travel Mate
 * 혼자 여행하는 사람을 위한 안전한 여행 가이드
 *
 * @format
 */

import { StatusBar, StyleSheet } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/auth/AuthContext';
import { colors } from './src/theme/colors';

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <StatusBar
            barStyle="dark-content"
            backgroundColor={colors.background}
          />
          <RootNavigator />
        </SafeAreaView>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default App;
