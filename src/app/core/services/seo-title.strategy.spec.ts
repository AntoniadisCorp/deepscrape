import { canonicalUrl, isIndexablePath, pathOf } from './seo-title.strategy';

describe('seo-title.strategy helpers', () => {
  it('maps urls to path keys', () => {
    expect(pathOf('/')).toBe('');
    expect(pathOf('/contact')).toBe('/contact');
    expect(pathOf('/contact/')).toBe('/contact');
    expect(pathOf('/contact?x=1#top')).toBe('/contact');
    expect(pathOf('/dashboard/')).toBe('/dashboard');
  });

  it('indexes only the public paths, with trailing-slash canonicals', () => {
    expect(isIndexablePath('')).toBe(true);
    expect(isIndexablePath('/contact')).toBe(true);
    expect(isIndexablePath('/dashboard')).toBe(false);
    expect(canonicalUrl('')).toBe('https://deepscrape.dev/');
    expect(canonicalUrl('/contact')).toBe('https://deepscrape.dev/contact/');
  });
});
