import {
  HomeWidgetConfiguration,
  HomeWidgetConfigurationMap,
  HomeWidgetPresentation,
} from '../types/homeWidget';

export const HOME_WIDGET_CONFIGURATION_KEY = 'playatlas_home_widget_configuration_v2';

const presentationByWidget: Record<string, HomeWidgetPresentation> = {
  featured: 'detail',
  playing: 'grid',
  progress: 'list',
  releases: 'list',
};

export function createDefaultWidgetConfiguration(id: string, title: string): HomeWidgetConfiguration {
  return {
    title,
    source: id.startsWith('list:') ? id : `system:${id}`,
    display: {
      presentation: id.startsWith('list:') ? 'list' : (presentationByWidget[id] || 'list'),
      itemLimit: id === 'featured' ? 1 : 6,
      showArtwork: true,
      showRating: true,
      showPlatforms: true,
      autoRotate: false,
      rotationSeconds: 8,
    },
  };
}

export function loadHomeWidgetConfigurations(): HomeWidgetConfigurationMap {
  try {
    const raw = localStorage.getItem(HOME_WIDGET_CONFIGURATION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('Unable to read Home widget settings:', error);
    return {};
  }
}

export function saveHomeWidgetConfigurations(configurations: HomeWidgetConfigurationMap): void {
  localStorage.setItem(HOME_WIDGET_CONFIGURATION_KEY, JSON.stringify(configurations));
}

export function resolveWidgetConfiguration(
  configurations: HomeWidgetConfigurationMap,
  id: string,
  title: string,
): HomeWidgetConfiguration {
  const defaults = createDefaultWidgetConfiguration(id, title);
  const stored = configurations[id];
  if (!stored) return defaults;
  return {
    ...defaults,
    ...stored,
    display: { ...defaults.display, ...stored.display },
  };
}
