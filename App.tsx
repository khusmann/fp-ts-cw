import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';

import { audioPlayerFromMessage } from './src/services/cw';

const shortMessage = 'Hello world, <BT> <BT>';
const longMessage = 'Hello world, this is a test one two three. This is super super long. lalalalalalalala. <BT> <BT>';

export default function App() {
  const player = useRef();

  const doPlay = async () => {
    if (!player.current) {
      player.current = await audioPlayerFromMessage(longMessage)({
        wpm: 20,
        farnsworth: 20,
        ews: 0,
        volume: 1,
        freq: 700,
        onFinished: () => console.log('finished'),
      })();
      console.log(await player.current.right.play());
    } else {
      console.log(player.current);
      console.log('stopping');
      console.log(await player.current.right.unload());
      console.log(await player.current.right.stop());
      //      console.log(await player.current.right.play());
      player.current = false;
      console.log('stopped');
    }
  };

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
