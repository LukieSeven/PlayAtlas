export type HomeWidgetPresentation = 'list' | 'carousel' | 'detail' | 'grid' | 'randomizer';

export interface HomeWidgetDisplaySettings {
  presentation: HomeWidgetPresentation;
  itemLimit: number;
  showArtwork: boolean;
  showRating: boolean;
  showPlatforms: boolean;
  autoRotate: boolean;
  rotationSeconds: number;
}

export interface HomeWidgetConfiguration {
  title: string;
  source?: string;
  display: HomeWidgetDisplaySettings;
}

export type HomeWidgetConfigurationMap = Record<string, HomeWidgetConfiguration>;
