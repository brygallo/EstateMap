import React from 'react';
import {Composition, Still} from 'remotion';
import {EstateMapVideo} from './video';
import {EstateMapCover} from './cover';
import {palette} from './theme';
import type {CoverProps, VideoProps} from './types';

const sampleCaptions = (text: string, seconds: number) => {
  const words = text.split(' ');
  const per = seconds / words.length;
  return [
    {
      text,
      start: 0,
      end: seconds,
      words: words.map((word, index) => ({text: word, start: index * per, end: (index + 1) * per})),
    },
  ];
};

const defaultProps: VideoProps = {
  brandId: 'geo',
  brandName: 'Geo Propiedades Ecuador',
  brandTagline: 'Un producto de Aents',
  brandSymbol: 'brand/aents-symbol-negative.png',
  title: 'Geo Propiedades Ecuador',
  coverText: 'Busca por zona',
  cta: 'Explora el mapa',
  url: 'geopropiedadesecuador.com',
  brandTile: null,
  kicker: null,
  musicFile: null,
  narrationFile: null,
  showSafeAreas: false,
  scenes: [
    {
      purpose: 'gancho',
      durationInFrames: 90,
      headline: 'Busca por zona',
      captions: sampleCaptions('La propiedad se entiende mejor en el mapa', 3),
      visualDirection: 'Mapa en movimiento',
      transition: 'fade',
      asset: null,
      assetType: null,
      photo: null,
      voiceFile: '',
      assetStartInFrames: 0,
      assetTotalInFrames: 90,
      accent: palette.green,
    },
    {
      purpose: 'cta',
      durationInFrames: 60,
      headline: 'Explora el mapa',
      captions: sampleCaptions('Entra y explora el mapa', 2),
      visualDirection: 'Cierre de marca',
      transition: 'cut',
      asset: null,
      assetType: null,
      photo: null,
      voiceFile: '',
      assetStartInFrames: 0,
      assetTotalInFrames: 90,
      accent: palette.violet,
    },
  ],
};

const coverProps: CoverProps = {
  brandId: 'geo',
  brandName: 'Geo Propiedades Ecuador',
  brandTagline: 'Un producto de Aents',
  brandSymbol: 'brand/aents-symbol-negative.png',
  coverText: 'Busca por zona',
  cta: 'Explora el mapa',
  audience: 'comprador',
  url: 'geopropiedadesecuador.com',
  brandTile: null,
  accent: palette.green,
  asset: null,
  assetType: null,
};

export const Root: React.FC = () => (
  <>
    <Composition
      id="EstateMapVideo"
      component={EstateMapVideo}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={150}
      defaultProps={defaultProps}
      calculateMetadata={({props}) => ({
        durationInFrames: Math.max(
          1,
          props.scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0),
        ),
      })}
    />
    <Composition
      id="SafeAreas"
      component={EstateMapVideo}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={150}
      defaultProps={{...defaultProps, showSafeAreas: true}}
      calculateMetadata={({props}) => ({
        durationInFrames: Math.max(
          1,
          props.scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0),
        ),
      })}
    />
    <Still id="EstateMapCover" component={EstateMapCover} width={1080} height={1920} defaultProps={coverProps} />
  </>
);
