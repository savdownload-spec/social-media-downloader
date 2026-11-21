import { describe, expect, it } from 'vitest';
import { instagramUsernameFromUrl, parseInstagramAvatarHtml } from './instagram';

describe('instagramUsernameFromUrl', () => {
  it('accepts profile URLs with query strings and trailing slashes', () => {
    expect(instagramUsernameFromUrl('https://www.instagram.com/instagram/?hl=en')).toBe('instagram');
    expect(instagramUsernameFromUrl('https://instagram.com/some.creator/')).toBe('some.creator');
  });

  it('rejects post URLs and non-Instagram hosts', () => {
    expect(instagramUsernameFromUrl('https://www.instagram.com/p/Cabc123/')).toBeNull();
    expect(instagramUsernameFromUrl('https://www.instagram.com.evil.example/instagram/')).toBeNull();
    expect(instagramUsernameFromUrl('https://example.com/instagram')).toBeNull();
    expect(instagramUsernameFromUrl('not a url')).toBeNull();
  });
});

describe('parseInstagramAvatarHtml', () => {
  it('prefers the HD field and decodes JSON escapes', () => {
    const html = '<script>{"profile_pic_url_hd":"https:\\/\\/scontent.cdninstagram.com\\/hd.jpg?a=1\\u0026b=2","profile_pic_url":"https:\\/\\/scontent.cdninstagram.com\\/small.jpg"}</script>';
    expect(parseInstagramAvatarHtml(html)).toEqual({
      url: 'https://scontent.cdninstagram.com/hd.jpg?a=1&b=2',
      hd: true,
    });
  });

  it('falls back to the standard field', () => {
    const html = '{"profile_pic_url":"https:\\/\\/scontent.cdninstagram.com\\/small.jpg"}';
    expect(parseInstagramAvatarHtml(html)).toEqual({
      url: 'https://scontent.cdninstagram.com/small.jpg',
      hd: false,
    });
  });

  it('falls back to the og:image meta tag', () => {
    const html = '<meta property="og:image" content="https://scontent.cdninstagram.com/pfp.jpg?a=1&amp;b=2" />';
    expect(parseInstagramAvatarHtml(html)).toEqual({
      url: 'https://scontent.cdninstagram.com/pfp.jpg?a=1&b=2',
      hd: false,
    });
  });

  it('returns null when no avatar is present', () => {
    expect(parseInstagramAvatarHtml('<html><body>Profile not available</body></html>')).toBeNull();
  });
});
