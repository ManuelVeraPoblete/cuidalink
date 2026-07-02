import { ReactNode } from 'react';
import { ImageBackground, StyleSheet, StyleProp, ViewStyle } from 'react-native';

type Props = { children: ReactNode; style?: StyleProp<ViewStyle> };

export default function ScreenBackground({ children, style }: Props) {
  return (
    <ImageBackground
      source={require('../../../assets/fondoapp.png')}
      style={[styles.background, style]}
      resizeMode="cover"
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
});
