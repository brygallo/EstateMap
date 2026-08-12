import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {MapField} from './map-field';
import {fit, useFontReady} from './layout';
import {font, headlineBox, palette, safe} from './theme';
import type {CoverProps} from './types';

/**
 * Still cover for the Instagram grid and the TikTok thumbnail. It has to read at
 * the size of a fingernail, so it carries three to six words and nothing else.
 */
export const EstateMapCover: React.FC<CoverProps> = ({coverText, url, brandTile, accent, asset, assetType}) => {
  const ready = useFontReady();
  const {fontSize, lines} = ready
    ? fit(coverText, {maxWidth: headlineBox.width, maxLines: 3, max: 168, min: 72, letterSpacing: '-0.05em'})
    : {fontSize: 120, lines: [coverText]};
  return (
    <AbsoluteFill style={{backgroundColor: palette.ink}}>
      <style>{`@font-face { font-family: 'EstateMap Display'; src: url('${staticFile(
        'fonts/PlusJakartaSans-ExtraBold.ttf',
      )}') format('truetype'); font-weight: 800; font-style: normal; font-display: block; }`}</style>
      {asset && assetType === 'image' ? (
        <AbsoluteFill>
          <Img src={staticFile(asset)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(8,9,21,.55) 0%, rgba(8,9,21,.92) 100%)'}} />
        </AbsoluteFill>
      ) : (
        <MapField accent={accent} frame={120} />
      )}
      {ready ? (
        <AbsoluteFill style={{justifyContent: 'center'}}>
          <div style={{position: 'absolute', left: safe.left, top: safe.top - 96, display: 'flex', alignItems: 'center', gap: 14, fontFamily: font, fontWeight: 800, fontSize: 26, color: palette.white}}>
            <div style={{width: 16, height: 16, borderRadius: 5, backgroundColor: accent}} />
            GEO PROPIEDADES
          </div>
          <div style={{position: 'absolute', left: headlineBox.left, width: headlineBox.width, top: 560}}>
            <div style={{width: 120, height: 16, borderRadius: 99, backgroundColor: accent, marginBottom: 40}} />
            <div
              style={{
                fontFamily: font,
                fontWeight: 800,
                fontSize,
                lineHeight: 0.97,
                letterSpacing: '-0.05em',
                color: palette.white,
                textShadow: '0 10px 44px rgba(8,9,21,.9)',
              }}
            >
              {lines.map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
          </div>
          <div style={{position: 'absolute', left: headlineBox.left, bottom: safe.bottom, display: 'flex', alignItems: 'center', gap: 24}}>
            {brandTile ? <Img src={staticFile(brandTile)} style={{width: 96, height: 96, borderRadius: 26}} /> : null}
            <div style={{fontFamily: font, fontWeight: 800, fontSize: 38, color: palette.white, letterSpacing: '-0.02em'}}>{url}</div>
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
