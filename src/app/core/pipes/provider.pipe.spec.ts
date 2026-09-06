import { ProviderPipe } from './provider.pipe';

describe('ProviderPipe', () => {
  it('returns null when user or providerData is missing', () => {
    const pipe = new ProviderPipe();
    expect(pipe.transform(null, 'google.com', 'email')).toBeNull();
    expect(pipe.transform({} as any, 'google.com', 'email')).toBeNull();
  });

  it('returns provider display fields by tag', () => {
    const pipe = new ProviderPipe();
    const user = {
      providerData: [{
        providerId: 'google.com',
        displayName: 'Jane Doe',
        email: 'jane@example.com',
        phoneNumber: '+1234',
        uid: 'uid-1',
        photoURL: 'https://example.com/provider.jpg',
      }],
      details: {},
    } as any;

    expect(pipe.transform(user, 'google.com', 'displayName')).toBe('Jane Doe');
    expect(pipe.transform(user, 'google.com', 'email')).toBe('jane@example.com');
    expect(pipe.transform(user, 'google.com', 'providerId')).toBe('google.com');
  });

  it('prefers details.photoURL over provider photoURL', () => {
    const pipe = new ProviderPipe();
    const user = {
      providerData: [{
        providerId: 'google.com',
        displayName: 'Jane Doe',
        photoURL: 'https://example.com/provider.jpg',
      }],
      details: {
        photoURL: 'https://example.com/details.jpg',
      },
    } as any;

    expect(pipe.transform(user, 'google.com', 'photoURL')).toBe('https://example.com/details.jpg');
  });
});
