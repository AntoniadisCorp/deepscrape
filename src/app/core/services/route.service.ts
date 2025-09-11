import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { GlobalTabs } from '../types';

@Injectable({
  providedIn: 'root'
})
export class RouteService {

  constructor() { }

  getInventoryTabs(DataTabs: GlobalTabs[]): Observable<GlobalTabs[]> {
    // TODO: send the message _after_ fetching the heroes
    // this.messageService.add('HeroService: fetched heroes');
    return of(DataTabs);
  }

  getData(Data: any[]): Observable<any[]> {
    // TODO: send the message _after_ fetching the heroes
    // this.messageService.add('HeroService: fetched heroes');
    return of(Data);
  }

  getInventoryTab(id: number | string, DataTabs: GlobalTabs[]) {
    return this.getInventoryTabs(DataTabs).pipe(
      // (+) before `id` turns the string into a number
      map((gTabs: GlobalTabs[]) =>
        gTabs.find(gTab => gTab.id === id)
      )
    );
  }
}
