import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.velopulse.app',
  appName: 'VeloPulse',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // For development, uncomment and set your IP:
    // url: 'http://192.168.1.100:5173',
    // cleartext: true
  },
  plugins: {
    BackgroundGeolocation: {
      notificationTitle: "VeloPulse Tracking",
      notificationText: "GPS tracking active",
      backgroundMessage: "Location tracking in progress",
      locationPermissionMessage: "VeloPulse needs access to your location for GPS tracking",
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#667eea",
      showSpinner: true,
      spinnerColor: "#ffffff"
    }
  }
};

export default config;
