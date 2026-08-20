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
  assetType: 'image' | 'video' | 'simulation' | null;
  photo: string | null;
  voiceFile: string;
  assetStartInFrames: number;
  assetTotalInFrames: number;
  accent: string;
};

export type VideoProps = {
  brandId?: string;
  brandName?: string;
  brandTagline?: string;
  brandSymbol?: string | null;
  title: string;
  coverText: string;
  cta: string;
  url: string;
  brandTile: string | null;
  kicker: string | null;
  musicFile: string | null;
  narrationFile?: string | null;
  showSafeAreas: boolean;
  scenes: Scene[];
};

export type CoverProps = {
  brandId?: string;
  brandName?: string;
  brandTagline?: string;
  brandSymbol?: string | null;
  coverText: string;
  /**
   * Which illustration to draw, named by the plan. The keyword heuristics below
   * it still run when this is absent, so covers planned before this existed
   * keep rendering exactly as they did.
   */
  coverArt?: string | null;
  // The cover carries the piece's own call to action and audience. Deriving
  // either from the cover text alone is how a professional video ended up
  // offering the buyer's CTA on its first frame.
  cta: string;
  audience: string;
  url: string;
  brandTile: string | null;
  accent: string;
  asset: string | null;
  assetType: 'image' | null;
};
