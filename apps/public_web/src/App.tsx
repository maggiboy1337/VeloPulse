import { useEffect } from 'react';
import { AppRouter } from './AppRouter';
import { serviceWorkerService } from './services/serviceWorkerService';
import './App.css';


function App() {
  // ========================================
  // PHASE 3 & 4: Service Worker Registration
  // ========================================
  useEffect(() => {
    // Register Service Worker on app mount
    const registerSW = async () => {
      const registered = await serviceWorkerService.register();

      if (registered) {
        console.log('✅ Service Worker registered successfully');

        // Request notification permission
        const notificationPermission = await serviceWorkerService.requestNotificationPermission();

        if (notificationPermission) {
          console.log('✅ Notification permission granted');
        }
      }
    };

    registerSW();

    // Subscribe to status updates
    const unsubscribe = serviceWorkerService.subscribe((status) => {
      console.log('📊 Service Worker Status:', status);

      // Show update notification if available
      if (status.updateAvailable && status.waiting) {
        console.log('🆕 Service Worker update available');
        // TODO: Show UI to prompt user to reload
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return <AppRouter />;
}

export default App;
