import { environment } from '../../../environments/environment';

export const API_DEPLOY4SCRAP = environment.production ? environment.API_DEPLOY4SCRAP + '/' : '/api'