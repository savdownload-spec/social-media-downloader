export type DownloadResult = {
  ok: true;
  title: string;
  thumbnail: string;
  duration?: number;
  author?: string;
  platform: string;
  formats: DownloadFormat[];
} | {
  ok: false;
  error: string;
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
