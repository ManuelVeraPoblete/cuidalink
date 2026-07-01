import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '@/presentation/screens/auth/LoginScreen';
import RegisterScreen from '@/presentation/screens/auth/RegisterScreen';

export type AuthStackParams = {
  Login: undefined;
  Register: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParams>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
