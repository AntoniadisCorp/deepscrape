import { Component } from '@angular/core';
import { FormGroup, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { Loading, Users } from 'src/app/core/types';
import { CommonModule } from '@angular/common';
import {
  Auth, GithubAuthProvider, GoogleAuthProvider,
  linkWithCredential,
  sendEmailVerification,
  signInWithEmailAndPassword, signInWithPopup,
  User
} from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { from } from 'rxjs/internal/observable/from';
import { getErrorMessage, storeUserData } from 'src/app/core/functions';
import { AuthService, FirestoreService } from 'src/app/core/services';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatProgressSpinner, MatIcon],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  protected loading: Loading
  protected loginForm: FormGroup

  protected errorMessage = '';

  protected isAuthenticated: boolean
  private authSubs: Subscription

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,

    private firestore: Firestore,

    private firestoreService: FirestoreService,

    private auth: Auth,

    private authService: AuthService,
  ) {
    this.loading = {
      github: false,
      google: false
    }


    this.authSubs = this.authService.isAuthenticated().subscribe(
      (authenticated: boolean) => {
        /* if (authenticated) {
          
          this.router.navigate(['/dashboard'])
        } */

        this.isAuthenticated = authenticated
      }
    )

    this.firestore = this.firestoreService.getInstanceDB('easyscrape')
  }


  get f() {
    return this.loginForm.controls

  }


  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.loginForm = this.formBuilder.group({
      email: [''],
      password: [''],
      rememberMe: [false],
    })
  }


  async login() {

    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, this.f['email'].value, this.f['password'].value);
      console.log('User logged in:', userCredential.user.displayName)

      from(this.firestoreService.getUserData(userCredential.user.uid)).subscribe(
        (userData: Users | null) => {
          if (userData) {
            this.isAuthenticated = true
            this.router.navigate(['/dashboard'])
          } else {
            this.router.navigate(['/service/login'])
          }
        }
      )

    } catch (error) {
      console.error('Login error:', error);
    }
  }

  async loginWithGoogle() {
    this.loading.google = true

    try {

      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')
      provider.addScope('openid')
      provider.setCustomParameters({ prompt: 'select_account' })

      const result = await signInWithPopup(this.auth, provider)
      console.log(this.auth.currentUser?.email, result.user.email, result.user.emailVerified, result.operationType)

      // Store additional user info in Firestore
      if (result.user) {
        // this.getUserData(result.user)
        await storeUserData(result.user, this.firestore);
      }

      this.router.navigate(['/dashboard'])
      // console.log('User logged in:', result.user);
    } catch (error: any) {
      this.errorMessage = getErrorMessage(error);
    } finally {
      this.loading.google = false;
    }
  }

  async loginWithGithub() {
    this.loading.github = true
    this.errorMessage = '';
    try {
      const provider = new GithubAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')
      provider.addScope('openid')
      provider.setCustomParameters({ prompt: 'select_account' })
      const result = await signInWithPopup(this.auth, provider)


      console.log(this.auth.currentUser?.email, result.user.email, provider.providerId, result.providerId, result.operationType)
      // Store additional user info in Firestore
      if (result.user) {
        await storeUserData(result.user, this.firestore)
      }

      this.router.navigate(['/dashboard'])
    } catch (error: any) {
      this.errorMessage = getErrorMessage(error);
    } finally {
      this.loading.github = false;
    }
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.authSubs?.unsubscribe()
  }
}
