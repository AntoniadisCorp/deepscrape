import { environment } from 'src/environments/environment';

export const API_ARACHNEFLY_URL = environment.production || environment.emulators ? '/api/machines' : '/machines'
export const API_ARACHNEFLY_UPLOAD_URL = environment.production || environment.emulators ? '/upload/machines' : '/machines'