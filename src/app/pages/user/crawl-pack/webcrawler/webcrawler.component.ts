import { Component, OnInit, OnDestroy, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CrawlPack, Headers } from 'src/app/core/types';
import { CartService } from 'src/app/core/services/cart.service';
import { AsyncPipe, JsonPipe, KeyValuePipe, NgFor, NgIf } from '@angular/common';
import { AuthService, FirestoreService } from 'src/app/core/services';
import { Observable } from 'rxjs/internal/Observable';
import { Subscription } from 'rxjs/internal/Subscription';
import { of } from 'rxjs/internal/observable/of';
import { from } from 'rxjs/internal/observable/from';
import { MatIcon } from '@angular/material/icon';
import { ReversePipe } from 'src/app/core/pipes';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { convertKeysToSnakeCase, switchPackageIcon, switchPackKey, } from 'src/app/core/functions';
import { Router } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';
import { ClipboardbuttonComponent } from 'src/app/core/components';
import { expandCollapseAnimation } from 'src/app/animations';
import { distinctUntilChanged } from 'rxjs/internal/operators/distinctUntilChanged';
import { filter } from 'rxjs/internal/operators/filter';
import { tap } from 'rxjs/internal/operators/tap';
import { RippleDirective } from 'src/app/core/directives';

@Component({
    selector: 'app-webcrawler',
    templateUrl: './webcrawler.component.html',
    styleUrl: './webcrawler.component.scss',
    imports: [ReactiveFormsModule, NgIf, NgFor, AsyncPipe, KeyValuePipe, JsonPipe, ReversePipe,
        MatIcon, MarkdownModule, RippleDirective],
    animations: [
        // animation triggers go here
        expandCollapseAnimation,
    ],
    standalone: true,
})
export class WebCrawlerComponent implements OnInit, OnDestroy {
    readonly clipboardButton = ClipboardbuttonComponent
    previousPacks: any[] = [];

    protected cartItems$: Observable<any>
    protected crawlPackages$: Observable<CrawlPack[] | null> = of([])
    cartSubscription: Subscription | undefined;
    itemVisibility: { [key: string]: WritableSignal<boolean> } = {};
    itemToJson: { [key: string]: any } = {}

    constructor(
        private cartService: CartService,
        private fireService: FirestoreService,
        private authService: AuthService,
        private router: Router
    ) {

    }

    ngOnInit(): void {

        this.cartItems$ = this.cartService.getCart().pipe(
            distinctUntilChanged((prevkey: any, currKey) => prevkey?.key !== currKey?.uid),
            filter(items => items !== null && items !== undefined),
            tap(items => {
                Object.keys(items).forEach((key) => {
                    if (key !== 'uid' && key !== 'type') {
                        this.itemVisibility[key] = signal(false)
                        this.itemToJson[key] = convertKeysToSnakeCase(switchPackKey(key, items[key]?.config))
                    }
                });
            })
        )

        // load most recent crawl packs
        if (this.authService.user?.uid)
            this.crawlPackages$ = from(this.fireService.loadPreviousPacks(this.authService.user.uid))
    }

    getObjectKeys(obj: any): string[] {
        return Object.keys(obj);
    }

    saveCartItems() {
        // this.fireService.(key, value)
    }

    protected openCartItem(event: Event, key: string) {
        console.log(event)
        console.log(key)
        switch (key) {
            case 'browserProfile':
                this.router.navigate(['/crawlpack/browser'], { fragment: 'controlling-each-browser' })
                break
            case 'crawlConfig':
                this.router.navigate(['/crawlpack/configuration'], { fragment: 'controlling-each-crawl' })
                break
            case 'crawlResultConfig':
                this.router.navigate(['/crawlpack/results'], { fragment: 'controlling-each-crawl-result' })
                break
            default:
                break
        }
    }

    protected openJsonFormat(event: Event, packKey: any, packValue: any) {

        event.stopPropagation()

        // toggle visibility of packValue
        this.itemVisibility[packKey]?.update(prev => {
            if (prev) {
                return !prev
            }
            return true
        })

        // reset all boolean signal values in itemVisibility to false except packValue
        Object.keys(this.itemVisibility).forEach(key => {
            if (key !== packKey) {
                this.itemVisibility[key]?.set(false)
            }
        })
        // set itemToJson to packValue
        this.itemToJson[packKey] = convertKeysToSnakeCase(switchPackKey(packKey, packValue?.config))
        // console.log(packKey, switchPackKey(packKey, snakeFormat))


    }
    protected openPythonFormat(event: Event, packKey: any, packValue: any) {
        event.stopPropagation()
        event.preventDefault()
        const snakeFormat = convertKeysToSnakeCase(packValue?.config)

    }

    convertKeysToSnakeCase(obj: any): any {
        return convertKeysToSnakeCase(obj)
    }

    switchIcon(packKey: string, browserType?: string): string {
        return switchPackageIcon(packKey, browserType)
    }

    protected parseCartItemDate(pastDate: number) {
        return formatDistanceToNow(new Date(pastDate), { addSuffix: true })
    }

    ngOnDestroy(): void {

        this.cartSubscription?.unsubscribe();

    }

}
