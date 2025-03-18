import { Inject, inject, Injectable, InjectionToken, OnInit } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { AuthService } from './auth.service';
import { Firestore } from '@angular/fire/firestore';
import { Subscription } from 'rxjs/internal/Subscription';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { BrowserProfile, CrawlConfig } from '../types';
import { from } from 'rxjs/internal/observable/from';
import { catchError } from 'rxjs/internal/operators/catchError';
import { throwError } from 'rxjs/internal/observable/throwError';
import { tap } from 'rxjs/internal/operators/tap';
import { storeBrowserProfile } from '../functions';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable } from 'rxjs/internal/Observable';
import { map } from 'rxjs/internal/operators/map';

export const CONTROL_NAME = new InjectionToken<string>('CONTROL_NAME');

@Injectable({
  providedIn: 'root'
})
export class PackService {

  private firestore: Firestore = inject(Firestore)
  private functions: Functions = inject(Functions)
  private auth: AuthService = inject(AuthService)
  private firestoreService: FirestoreService = inject(FirestoreService)

  private userId: string

  private fireSaveSub: Subscription
  private browserSubject = new BehaviorSubject<BrowserProfile[] | null | undefined>(undefined)
  private totalPagesBrowserSubject = new BehaviorSubject<number>(1)
  private inTotalBrowserSubject = new BehaviorSubject<number>(0)

  private configSubject = new BehaviorSubject<CrawlConfig[] | null | undefined>(undefined)
  private totalPagesConfigSubject = new BehaviorSubject<number>(1)
  private inTotalConfigSubject = new BehaviorSubject<number>(0)

  /* Browser Profiles Configuration Observables */
  browserProfiles$: Observable<BrowserProfile[] | null | undefined> = this.browserSubject.asObservable()
  totalPagesBrowsers$: Observable<number> = this.totalPagesBrowserSubject.asObservable()
  inTotalBrowsers$: Observable<number> = this.inTotalBrowserSubject.asObservable()

  /* Crawler Configuration Observables */
  crawlConfigs$: Observable<CrawlConfig[] | null | undefined>
  totalPagesConfigs$: Observable<number>
  inTotalConfigs$: Observable<number>


  constructor(@Inject(CONTROL_NAME) private _controlName: string) {

    this.controlName = _controlName || 'defaultControlName';

    this.userId = this.auth.user?.uid || 'user_id'
    // set the firestore instance
    this.firestore = this.firestoreService.getInstanceDB('easyscrape')

    this.initializeObservables()
  }

  get controlName(): string {
    return this._controlName;
  }

  set controlName(value: string) {
    this._controlName = value;
  }

  private initializeObservables() {
    switch (this.controlName) {
      case 'browserProfiles':
        this.browserProfiles$ = this.browserSubject.asObservable()
        this.totalPagesBrowsers$ = this.totalPagesBrowserSubject.asObservable()
        this.inTotalBrowsers$ = this.inTotalBrowserSubject.asObservable()
        this.initializeBrowserProfiles(null)
        break
      case 'crawlConfigs':
        this.crawlConfigs$ = this.configSubject.asObservable()
        this.totalPagesConfigs$ = this.totalPagesConfigSubject.asObservable()
        this.inTotalConfigs$ = this.inTotalConfigSubject.asObservable()
        this.initializeCrawlConfig(null)
        break
      default:
        break
    }
  }

  private initializeBrowserProfiles(localProfiles: string | null) {
    if (localProfiles) {
      this.browserSubject.next(JSON.parse(localProfiles))
      // this.totalPagesSubject.next(1)
    } else {
      this.browserSubject.next(undefined)
      this.totalPagesBrowserSubject.next(1)
      // Get Data from Firestore
      this.fireSaveSub = this.getBrowserProfilesByPagination().pipe(
      ).subscribe({
        next: (results: any) => {
          const { profiles, inTotal, totalPages } = results
          // include totalPages in the response
          // Update the Browser Profiles in the BehaviorSubject
          this.browserSubject.next(profiles)
          this.totalPagesBrowserSubject.next(totalPages)
          this.inTotalBrowserSubject.next(inTotal)
          // this.saveOperations(operations)
        },
        error: (error: any) => {
          console.error('Error retrieving Browser Profiles:', error)
          this.browserSubject.next(null)
          this.totalPagesBrowserSubject.next(0)
          this.inTotalBrowserSubject.next(0)
        }
      })
    }


  }

  private initializeCrawlConfig(localCrawlConfig: string | null) {
    if (localCrawlConfig) {
      this.configSubject.next(JSON.parse(localCrawlConfig))
      // this.totalPagesSubject.next(1)
    } else {
      this.configSubject.next(undefined)
      this.totalPagesConfigSubject.next(1)
      // Get Data from Firestore
      this.fireSaveSub = this.getCrawlConfigsByPagination().pipe(
      ).subscribe({
        next: (results: any) => {
          const { configs, inTotal, totalPages } = results
          // include totalPages in the response
          // Update the Browser Profiles in the BehaviorSubject
          this.configSubject.next(configs)
          this.totalPagesConfigSubject.next(totalPages)
          this.inTotalConfigSubject.next(inTotal)
          // this.saveOperations(operations)
        },
        error: (error: any) => {
          console.error('Error retrieving Browser Profiles:', error)
          this.configSubject.next(null)
          this.totalPagesConfigSubject.next(0)
          this.inTotalConfigSubject.next(0)
        }
      })
    }


  }


  storeBrowserProfile(browserProfile: BrowserProfile) {

    // get the user document
    return from(storeBrowserProfile(this.userId, browserProfile, this.firestore)).pipe(
      tap(() => {

        // Get the current BehaviorSubject Value
        const browserProfiles: BrowserProfile[] | null | undefined = this.browserSubject.value
        let totalPages: number = this.totalPagesBrowserSubject.value

        console.log(totalPages)
        if (!browserProfiles || totalPages > 1)
          return

        // keep 10 size data
        if (browserProfiles.length >= 10)
          browserProfiles.pop()
        // maintaining sorted order
        browserProfiles.unshift(browserProfile)

        // Update the Operations in the BehaviorSubject, 
        this.browserSubject.next(browserProfiles)

        totalPages = browserProfiles.length > 10 ? 2 : 1
        this.totalPagesBrowserSubject.next(totalPages)
      }),
      catchError((err) => {
        console.error(err)
        return throwError(() => err)
      })
    )
  }



  private getBrowserProfilesByPagination(currPage: number = 1, pageSize: number = 10): Observable<any> {
    return from(httpsCallable(this.functions, "getBrowserProfilesPaging")
      ({ currPage, pageSize }))
      .pipe(
        map((fun: any) => {
          const { error, profiles, inTotal, totalPages, message } = fun.data as any

          if (error) {
            console.error('Error retrieving Browser Profiles by pagination:', error, profiles, message)
            throw new Error(message, error)
          }

          return { profiles, inTotal, totalPages }
        })
      )
  }


  private getCrawlConfigsByPagination(currPage: number = 1, pageSize: number = 10): Observable<any> {
    return from(httpsCallable(this.functions, "getCrawlConfigsPaging")
      ({ currPage, pageSize }))
      .pipe(
        map((fun: any) => {
          const { error, configs, inTotal, totalPages, message } = fun.data as any

          if (error) {
            console.error('Error retrieving Crawler Configurations by pagination:', error, configs, message)
            throw new Error(message, error)
          }
          return { configs, inTotal, totalPages }
        })
      )
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    // this.operationSubject?.unsubscribe()
    this.fireSaveSub?.unsubscribe()
  }

}
