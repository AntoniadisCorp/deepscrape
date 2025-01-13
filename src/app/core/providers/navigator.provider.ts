import { isPlatformBrowser } from '@angular/common';
import { InjectionToken, PLATFORM_ID } from '@angular/core';

export const NAVIGATOR = new InjectionToken<Navigator>('Navigator')


function navigatorFactory(platformId: any) {
    return isPlatformBrowser(platformId) ? navigator : null;
}

export const NAVIGATOR_PROVIDER = {
    provide: NAVIGATOR,
    useFactory: navigatorFactory,
    deps: [PLATFORM_ID],
};