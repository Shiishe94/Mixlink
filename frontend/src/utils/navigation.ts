import { router } from 'expo-router';

/**
 * Smart back navigation: goes back if possible, otherwise navigates to home.
 */
export const goBack = () => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)');
  }
};
