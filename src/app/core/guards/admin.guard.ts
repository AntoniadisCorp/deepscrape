import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthzService } from '../services';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
    constructor(
        private router: Router,
        private authzService: AuthzService

    ) { }

    canActivate(): Observable<boolean> {
        return this.authzService.hasPlatformAdminAccess$().pipe(
            tap(isAdmin => {
                if (!isAdmin) {
                    this.router.navigate(['/']);
                }
            })


        )
    }
}
