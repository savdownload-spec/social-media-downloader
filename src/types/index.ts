export type DownloadRestriction = {
  code: string;
  message: string;
  alternatives?: { label: string; href: string; description: string }[];
};

export type DownloadResult = {
  ok: true;
  title: string;
  thumbnail: string;
  duration?: number;
  author?: string;
  platform: string;
  formats: DownloadFormat[];
  downloadPermitted?: boolean;
  restriction?: DownloadRestriction;
} | {
  ok: false;
  error: string;
  code?: string;
  restriction?: DownloadRestriction;
};

export type DownloadFormat = {
  label: string;
  quality: string;
  extension: string;
  size?: string;
  url: string;
  hasAudio?: boolean;
  hasVideo?: boolean;
};
