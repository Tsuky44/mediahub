declare module 'react-leaflet-heatmap-layer-v3' {
  import type { ComponentType } from 'react';

  export interface HeatmapLayerProps<T> {
    points: T[];
    latitudeExtractor: (point: T) => number;
    longitudeExtractor: (point: T) => number;
    intensityExtractor: (point: T) => number;
    gradient?: Record<number | string, string>;
    radius?: number;
    blur?: number;
    max?: number;
    minOpacity?: number;
    maxZoom?: number;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const HeatmapLayer: ComponentType<HeatmapLayerProps<any>>;
}
