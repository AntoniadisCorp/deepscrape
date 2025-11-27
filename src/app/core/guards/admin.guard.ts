import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { AuthService, FirestoreService } from '../services';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
    constructor(
        private afAuth: AuthService,
        private router: Router,

        private fireService: FirestoreService

    ) { }

    canActivate(): Observable<boolean> {
        return this.fireService.authState().pipe(
            map(user => ({ isAuthenticated: !!user, user })),
            switchMap(async isAuthData => {
                const { isAuthenticated, user } = isAuthData

                if (!isAuthenticated) {
                    this.router.navigate(['/login']);
                    return false;
                }
                const tokenResult = await user?.getIdTokenResult();
                return tokenResult;
            }),
            map(tokenResult => {
                console.log('AdminGuard - Token Result:', tokenResult)
                if (tokenResult && typeof tokenResult !== 'boolean') {
                    return !!tokenResult.claims?.['admin'];
                }
                return false;
            }),
            tap(isAdmin => {
                if (!isAdmin) {
                    this.router.navigate(['/']);
                }
            })


        )
    }
}
