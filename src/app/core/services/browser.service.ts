import { InjectionToken } from '@angular/core';

export interface Chrome {
  runtime: any;
  [key: string]: any;
}

export const BrowserToken = new InjectionToken<Chrome>('chrome');

function getChrome(): Chrome {
  return chrome;
}

function nativeChrome(): Chrome {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return getChrome()
  }
  return chrome;
}

export function browserProvider() { return nativeChrome(); }