import { provideServerRendering, withRoutes } from '@angular/ssr';
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { appConfig } from './app.config';
// import { provideServerRouting } from '@angular/ssr';
// import { serverRoutes } from './app.routes.server';
// import { provideServerRoutesConfig } from '@angular/ssr';

const serverConfig: ApplicationConfig = {
  providers: []
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
