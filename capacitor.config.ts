import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.metube.app',
  appName: 'MeTube',
  webDir: '.',
  server: {
    androidScheme: 'https'
  }
};

export default config;
