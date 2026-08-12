export type Word = {
  text: string;
  start: number;
  end: number;
};

export type Caption = {
  text: string;
  start: number;
  end: number;
  words: Word[];
};

export type Purpose = 'gancho' | 'problema' | 'prueba' | 'resultado' | 'cta';

export type Scene = {
  purpose: Purpose;
  durationInFrames: number;
  headline: string;
  captions: Caption[];
  visualDirection: string;
  transition: 'cut' | 'fade';
  asset: string | null;
  assetType: 'image' | 'video' | null;
  voiceFile: string;
  accent: string;
};

export type VideoProps = {
  title: string;
  coverText: string;
  cta: string;
  url: string;
  brandTile: string | null;
  musicFile: string | null;
  showSafeAreas: boolean;
  scenes: Scene[];
};

export type CoverProps = {
  coverText: string;
  url: string;
  brandTile: string | null;
  accent: string;
  asset: string | null;
  assetType: 'image' | 'video' | null;
};
