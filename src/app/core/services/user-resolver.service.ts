import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { AuthService } from 'src/app/core/services';
import { filter, map, Observable } from 'rxjs';
import { Users } from '../types';
import { UserInfo } from '@angular/fire/auth';
import { combineLatest } from 'rxjs/internal/observable/combineLatest';

@Injectable({ providedIn: 'root' })
export class UserResolver implements Resolve<Users & { currProviderData: UserInfo | null } | null> {
  constructor(private authService: AuthService) {}

  resolve(): Observable<Users & { currProviderData: UserInfo | null } | null> {
    return combineLatest([
      this.authService.isAuthStateResolved, // Wait for auth state to be resolved
      this.authService.user$
    ]).pipe(
      filter(([isResolved]) => isResolved), // Ensure auth state is resolved
      map(([, user]) => user) // Return the user data
    )
  }
}