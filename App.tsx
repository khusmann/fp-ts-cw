import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button } from 'react-native';

import { playMessage } from './src/services/cw';

const doPlay = async () => {
  const result = await playMessage('Hello world, <BT> <BT>')({
    wpm: 20,
    farnsworth: 20,
    ews: 0,
    volume: 1,
    freq: 700,
    onFinished: () => console.log('finished'),
  })();
  console.log(result);
};

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
      <Button title="Click me" onPress={doPlay} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
