import { Image as RNImage, type ImageProps as RNImageProps, type ImageSourcePropType } from 'react-native';

export type ImageSource = ImageSourcePropType;

export interface ImageProps extends Omit<RNImageProps, 'source' | 'resizeMode'> {
  source: ImageSource;
  /** expo-image's prop name for what RN calls `resizeMode`. */
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

const CONTENT_FIT_TO_RESIZE_MODE: Record<NonNullable<ImageProps['contentFit']>, RNImageProps['resizeMode']> = {
  cover: 'cover',
  contain: 'contain',
  fill: 'stretch',
  none: 'center',
  'scale-down': 'contain',
};

/** Drop-in replacement for expo-image, aliased in vite.config.ts — RNW's own Image renders an <img> on web. */
export function Image({ contentFit, ...rest }: ImageProps) {
  return <RNImage resizeMode={contentFit ? CONTENT_FIT_TO_RESIZE_MODE[contentFit] : undefined} {...rest} />;
}
