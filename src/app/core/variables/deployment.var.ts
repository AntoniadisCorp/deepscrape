import { environment } from 'src/environments/environment';

export const API_DEPLOY4SCRAP = environment.production ? '/api/machines' : '/machines'