import { Injectable, OnDestroy, OnInit, inject } from '@angular/core';
import { HttpRequest, HttpErrorResponse, HttpInterceptorFn, HttpHandlerFn, } from '@angular/common/http';

import { throwError, BehaviorSubject, ReplaySubject, from, Subscription, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services';
import { Router } from '@angular/router';

@Injectable(

  { providedIn: 'root' }
)
export class TokenInterceptor implements OnInit, OnDestroy {


  constructor() { }

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
  }

  intercept: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {


    // Check if the request is for an SVG icon
    if (req.url.endsWith('.svg')) {
      // If it's an SVG request, pass it through without modification
      return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            // Redirect to the login page if the user is not authenticated
            console.log('.svg', error);
            return this.handle401Error(req, next)
          }
          return throwError(() => error)
        })
      );
    }

    // If it's not an SVG request, proceed with the token handling
    console.log('TokenInterceptor:', req);
    return next(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          console.log('TokenInterceptor:', error)
          return this.handle401Error(req, next)
        }
        return throwError(() => error);
      })
    );
  }



  private handle401Error(request: HttpRequest<any>, next: HttpHandlerFn) {

    return of(null).pipe(
      switchMap(() => {

        return next(request);
      })/* ,
      catchError((refreshError) => {

        // If refresh fails, navigate to login or handle accordingly
        return throwError(() => refreshError)
      }) */)


  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.

  }
}
