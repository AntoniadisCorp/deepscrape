import { InjectionToken } from '@angular/core';

export const WindowToken = new InjectionToken<Window>('Window');

function getWindow(): any {
  return window;
}

function nativeWindow(): Window {

  if (typeof window !== 'undefined') {
    return getWindow()
  }
  return new Window(); // does this work?

}

export function windowProvider() { return nativeWindow(); }