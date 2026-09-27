import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.bolsillo.app',
  appName: 'Bolsillo',
  webDir: 'dist/bolsillo/browser',
  backgroundColor: '#f4f3ee',
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Ionic,
      style: KeyboardStyle.Light,
      autoBackdropColor: 'auto',
    },
  },
};

export default config;
