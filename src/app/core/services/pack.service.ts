import { Inject, inject, Injectable, InjectionToken, OnInit } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { AuthService } from './auth.service';
import { Firestore } from '@angular/fire/firestore';
import { Subscription } from 'rxjs/internal/Subscription';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { BrowserProfile, CrawlConfig, CrawlResult } from '../types';
import { from } from 'rxjs/internal/observable/from';
import { catchError } from 'rxjs/internal/operators/catchError';
import { throwError } from 'rxjs/internal/observable/throwError';
import { tap } from 'rxjs/internal/operators/tap';
import { storeBrowserProfile, storeCrawlConfig, storeCrawlResultsConfig } from '../functions';
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

  private crawlResultsSubject = new BehaviorSubject<any[] | null | undefined>(undefined)
  private totalPagesResultsSubject = new BehaviorSubject<number>(1)
  private inTotalResultsSubject = new BehaviorSubject<number>(0)

  /* Browser Profiles Configuration Observables */
  browserProfiles$: Observable<BrowserProfile[] | null | undefined> = this.browserSubject.asObservable()
  totalPagesBrowsers$: Observable<number> = this.totalPagesBrowserSubject.asObservable()
  inTotalBrowsers$: Observable<number> = this.inTotalBrowserSubject.asObservable()

  /* Crawler Configuration Observables */
  crawlConfigs$: Observable<CrawlConfig[] | null | undefined>
  totalPagesConfigs$: Observable<number>
  inTotalConfigs$: Observable<number>


  /* Crawler Results Configuration Observables */
  crawlResults$: Observable<any[] | null | undefined>
  totalPagesResults$: Observable<number>
  inTotalResults$: Observable<number>

  /* Crawler Results Configuration Observables */



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
      case 'crawlResults':
        this.crawlResults$ = this.crawlResultsSubject.asObservable()
        this.totalPagesResults$ = this.totalPagesResultsSubject.asObservable()
        this.inTotalResults$ = this.inTotalResultsSubject.asObservable()
        this.initializeCrawlResults(null)
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

  private initializeCrawlResults(localCrawlResults: string | null) {
    if (localCrawlResults) {
      this.crawlResultsSubject.next(JSON.parse(localCrawlResults))
      // this.totalPagesSubject.next(1)
    } else {
      this.crawlResultsSubject.next(undefined)
      this.totalPagesResultsSubject.next(1)
      // Get Data from Firestore
      this.fireSaveSub = this.getCrawlResultConfigsByPagination().pipe(
      ).subscribe({
        next: (results: any) => {
          const { crawlResultConfigs, inTotal, totalPages } = results
          // include totalPages in the response
          // Update the Crawl Config Results in the BehaviorSubject
          this.crawlResultsSubject.next(crawlResultConfigs)
          this.totalPagesResultsSubject.next(totalPages)
          this.inTotalResultsSubject.next(inTotal)
          // this.saveOperations(operations)
        },
        error: (error: any) => {
          console.error('Error retrieving Crawler Config Results:', error)
          this.crawlResultsSubject.next(null)
          this.totalPagesResultsSubject.next(0)
          this.inTotalResultsSubject.next(0)
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

  storeCrawlConfig(crawlConfig: CrawlConfig) {
    // get the user document
    return from(storeCrawlConfig(this.userId, crawlConfig, this.firestore)).pipe(
      tap(() => {
        // Get the current BehaviorSubject Value
        const crawlConfigs: CrawlConfig[] | null | undefined = this.configSubject.value
        let totalPages: number = this.totalPagesConfigSubject.value


        console.log(totalPages)
        if (!crawlConfigs || totalPages > 1)
          return

        // keep 10 size data
        if (crawlConfigs.length >= 10)
          crawlConfigs.pop()
        // maintaining sorted order
        crawlConfigs.unshift(crawlConfig)

        // Update the Operations in the BehaviorSubject, 
        this.configSubject.next(crawlConfigs)

        totalPages = crawlConfigs.length > 10 ? 2 : 1
        this.totalPagesConfigSubject.next(totalPages)
      }),
      catchError((err) => {
        console.error(err)
        return throwError(() => err)
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

  storeCrawlResultConfig(crawlResultConfig: any) {
    // get the user document
    return from(storeCrawlResultsConfig(this.userId, crawlResultConfig, this.firestore)).pipe(
      tap(() => {
        // Get the current BehaviorSubject Value
        const crawlConfigs: any[] | null | undefined = this.crawlResultsSubject.value
        let totalPages: number = this.totalPagesResultsSubject.value


        console.log(totalPages)
        if (!crawlConfigs || totalPages > 1)
          return

        // keep 10 size data
        if (crawlConfigs.length >= 10)
          crawlConfigs.pop()
        // maintaining sorted order
        crawlConfigs.unshift(crawlResultConfig)

        // Update the Operations in the BehaviorSubject, 
        this.configSubject.next(crawlConfigs)

        totalPages = crawlConfigs.length > 10 ? 2 : 1
        this.totalPagesResultsSubject.next(totalPages)
      }),
      catchError((err) => {
        console.error(err)
        return throwError(() => err)
      })
    )
  }

  private getCrawlResultConfigsByPagination(currPage: number = 1, pageSize: number = 10) {
    return from(httpsCallable(this.functions, "getCrawlResultConfigsPaging")
      ({ currPage, pageSize }))
      .pipe(
        map((fun: any) => {
          const { error, crawlResultConfigs, inTotal, totalPages, message } = fun.data as any

          if (error) {
            console.error('Error retrieving Crawler Configurations by pagination:', error, crawlResultConfigs, message)
            throw new Error(message, error)
          }
          return { crawlResultConfigs, inTotal, totalPages }
        })
      )

  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    // this.operationSubject?.unsubscribe()
    this.fireSaveSub?.unsubscribe()
    this.browserSubject?.unsubscribe()
    this.configSubject?.unsubscribe()
    this.crawlResultsSubject?.unsubscribe()
    this.totalPagesBrowserSubject?.unsubscribe()
    this.totalPagesConfigSubject?.unsubscribe()
    this.totalPagesResultsSubject?.unsubscribe()
    this.inTotalConfigSubject?.unsubscribe()
    this.inTotalResultsSubject?.unsubscribe()
    this.inTotalBrowserSubject?.unsubscribe()
  }

}
