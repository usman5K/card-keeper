import type { ConfigContext, ExpoConfig } from 'expo/config';

type AppVariant = 'development' | 'preview' | 'production';

const variants: Record<
  AppVariant,
  { name: string; bundleIdentifier: string }
> = {
  development: {
    name: 'FuelLedger (Dev)',
    bundleIdentifier: 'com.cardkeeper.fuelledger.dev',
  },
  preview: {
    name: 'FuelLedger (Preview)',
    bundleIdentifier: 'com.cardkeeper.fuelledger.preview',
  },
  production: {
    name: 'FuelLedger',
    bundleIdentifier: 'com.cardkeeper.fuelledger',
  },
};

function resolveVariant(raw: string | undefined): AppVariant {
  if (raw === 'development' || raw === 'preview' || raw === 'production') {
    return raw;
  }
  return 'production';
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const appVariant = resolveVariant(process.env.APP_VARIANT);
  const { name, bundleIdentifier } = variants[appVariant];

  return {
    ...config,
    name,
    slug: 'fuel-ledger',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'fuelledger',
    userInterfaceStyle: 'automatic',
    ios: {
      supportsTablet: true,
      bundleIdentifier,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#F7F6F2',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      package: bundleIdentifier,
      predictiveBackGestureEnabled: false,
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          resizeMode: 'contain',
          backgroundColor: '#F7F6F2',
        },
      ],
      'expo-sharing',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      appVariant,
    },
  };
};
