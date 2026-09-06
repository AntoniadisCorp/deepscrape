/**
 * Global test setup - automatically executed before tests run.
 * Spies on console.error to suppress noisy ERROR: 'ERROR', Object{} messages
 * from Firebase services that fail to initialize in test environment but are properly mocked.
 */

// Use a try-catch since this file might be loaded in non-test environments
try {
  // Set up the spy to suppress console.error messages that appear during tests
  // This is needed because Firebase Appcheck, Analytics, and other services attempt
  // to initialize and fail in the test environment (since we're mocking them),
  // causing console.error calls that Karma logs as 'ERROR: ERROR, Object{}'
  beforeEach(() => {
    if (typeof spyOn === 'function' && console && typeof console.error === 'function') {
      spyOn(console, 'error').and.stub();
    }
  });
} catch (_) {
  // Silently ignore if we're not in a Jasmine test environment
}

