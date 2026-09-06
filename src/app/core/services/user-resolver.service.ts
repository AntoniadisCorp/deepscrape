import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { AuthService, OrganizationService } from 'src/app/core/services';
import { catchError, filter, map, Observable, of, switchMap } from 'rxjs';
import { Users } from '../types';
import { UserInfo } from '@angular/fire/auth';
import { combineLatest } from 'rxjs/internal/observable/combineLatest';

@Injectable({ providedIn: 'root' })
export class UserResolver implements Resolve<Users & { currProviderData: UserInfo | null } | null> {
  constructor(
    private authService: AuthService,
    private organizationService: OrganizationService,
  ) {}

  resolve(): Observable<Users & { currProviderData: UserInfo | null } | null> {
    return combineLatest([
      this.authService.isAuthStateResolved, // Wait for auth state to be resolved
      this.authService.user$
    ]).pipe(
      filter(([isResolved]) => isResolved), // Ensure auth state is resolved
      map(([, user]) => user),
      switchMap((user) => {
        if (!user?.uid) {
          return of(user)
        }

        return this.organizationService.listMyOrganizations().pipe(
          map(() => user),
          catchError(() => of(user)),
        )
      }),
    )
  }
}