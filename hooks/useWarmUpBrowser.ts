import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';

export const useWarmUpBrowser = () => {
  useEffect(() => {
    // Warm up the browser for better UX
    void WebBrowser.warmUpAsync();
    return () => {
      // Cool down the browser when component unmounts
      void WebBrowser.coolDownAsync();
    };
  }, []);
};
