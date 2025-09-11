import { JsonPipe, NgClass, NgFor, NgIf, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GithubAuthProvider, GoogleAuthProvider, updateProfile, UserCredential, UserInfo } from '@angular/fire/auth';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { from } from 'rxjs/internal/observable/from';
import { RadioToggleComponent, SnackBarType, StinputComponent } from 'src/app/core/components';
import { createPasswordStrengthValidator, RippleDirective } from 'src/app/core/directives';
import { checkPasswordStrength, getErrorLabel, getErrorMessage } from 'src/app/core/functions';
import { FormControlPipe } from 'src/app/core/pipes';
import { AuthService, FirestoreService, LocalStorage, SnackbarService } from 'src/app/core/services';
import { Loading, Users } from 'src/app/core/types';
import { DEFAULT_PROFILE_URL } from 'src/app/core/variables';
import { myIcons, themeStorageKey } from 'src/app/shared';

@Component({
  selector: 'app-security-tab',
  imports: [ReactiveFormsModule, StinputComponent, FormControlPipe,
    NgFor, MatIcon, RippleDirective, RadioToggleComponent, UpperCasePipe, 
  MatProgressSpinnerModule, LucideAngularModule, NgClass, NgIf
],
  templateUrl: './security.component.html',
  styleUrl: './security.component.scss',
})
export class SecurityTabComponent {

  readonly icons = myIcons
  user: Users & { currProviderData: UserInfo | null } | null = null

  remProviders: string[]
  loginProviders: string[]

  loading: Loading = {
    github: false,
    google: false,
    logout: false,
    password: false,
    code: false,
    phone: false,
    email: false,
    mfa: false
  }
  securityForm: FormGroup
  private localStorage = inject(LocalStorage)
  private route = inject(ActivatedRoute)
  private destroyRef = inject(DestroyRef)

  private authService = inject(AuthService)
  private firestoreService = inject(FirestoreService)

  private snackbarService = inject(SnackbarService)

  themeDarkMode: boolean

  hasProviderPassword = signal<{provider: string, has: boolean}>({provider: '', has: false})


  public get email() {
    return this.securityForm.get('email')
  }

  public get password() {
    return this.securityForm.get('password')
  }

  public get mfa() {
    return this.securityForm.get('mfa')
  }

  constructor(private cdr: ChangeDetectorRef, private fb: FormBuilder,) {

    this.themeDarkMode = this.localStorage?.getItem(themeStorageKey) === 'true'
  }


  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.initSecurityForm()
    this.initProviders()
  }


  private initSecurityForm() {

    // set user data from resolver
    this.initUser()

    // initialize form
    this.securityForm = this.fb.group({

      email: this.fb.control<string>(this.user?.email ?? '',
        {
          updateOn: 'change', //default will be change
          validators: [
            Validators.required,
            Validators.email,
            Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$')
          ]
        }),
      password: this.fb.control<string>('', {
        updateOn: 'change', //default will be
        nonNullable: true,
        validators: [
          Validators.minLength(8),
          // Strong Password Validation
          createPasswordStrengthValidator(),
          // Strong Password Validation
          // forbiddenNameValidator(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/i)
        ]
      }),
      mfa: this.fb.control<boolean>(this.user?.mfa_nabled ?? false, {
        updateOn: 'change', //default will be change
        validators: [
          Validators.required,
          // Strong Password Validation
          // forbiddenNameValidator(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/i)
        ]
      })
    })

    this.email?.disable()
  }

  initUser() {
    this.user = this.route.snapshot.data['user']
    this.hasProviderPassword.set({provider: this.user?.providerId || '', 
      has: this.user?.providerData.some(p => p.providerId === 'password') ?? false})
  }

  initProviders() {
    const providersData = this.user?.providerData.map(p => p.providerId.replace('.com', ''))
    this.remProviders = providersData?.filter(p => p !== 'password') ?? []
    this.loginProviders = ['google', 'github'].filter(p => !this.remProviders.includes(p))
  }


  linkLoginProvider(provider: string) {
    console.log('linkLoginProvider', provider)

    switch (provider) {
      case 'google':
        this.linkWithGoogle()
        break
      case 'github':
        this.linkWithGitHub()
        break
      default:
        break
    }

  }

  private linkWithGoogle() {
    this.loading.google = true;
    const provider = new GoogleAuthProvider()
    provider.addScope("email")
    provider.addScope("profile")
    provider.addScope("openid")

    provider.setCustomParameters({ prompt: 'select_account' })
    from(this.authService.linkProvider(provider))

      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        {
          next: async (response) => {

            if (response.user) {
              // this.pendingCredential = GoogleAuthProvider.credentialFromResult(response.result);
              // If there's a pending credential from a previous social login attempt, link it now
              // const userCredential =  await this.handlePendingCredentialLinking(response.user)
              // response.user = userCredential?.user || response.user
              if (response.user.displayName || response.user.photoURL) {
                await updateProfile(response.user, {
                  displayName: response.user.displayName,
                  photoURL: response.user.photoURL ? response.user.photoURL : DEFAULT_PROFILE_URL,

                })
              }
              await this.firestoreService.storeUserData(response.user, this.user?.providerId || 'google.com', true, this.user?.username)
              // this.authService.initAuth()
              // refresh providers data instead of re-init whole auth state
              this.loginProviders = this.loginProviders.filter(p => p !== 'google')
              this.remProviders.push('google')
              this.showSnackbar('Google provider linked Sucessfully', SnackBarType.success, '', 3000)
              this.cdr.detectChanges()
            }
          },
          error: (error) => {
            // this.extractFirebaseError(error)
            // this.handleAccountExistsError(error, 'google.com')
            const errorMessage = getErrorMessage(error)
            this.showSnackbar(errorMessage, SnackBarType.error, '', 5000)
            this.loading.google = false
            this.cdr.detectChanges()
          },
          complete: () => {
            this.loading.google = false
            this.cdr.detectChanges()
          }
        }
      )
  }

  private linkWithGitHub() {
    this.loading.github = true;

    const provider = new GithubAuthProvider();
    provider.addScope('user:email')
    provider.addScope('read:user')
    provider.setCustomParameters({ prompt: 'select_account' })


    from(this.authService.linkProvider(provider))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        {
          next: async (response) => {

            if (response.user) {
              // this.pendingCredential = GithubAuthProvider.credentialFromResult(response.result);
              // If there's a pending credential from a previous social login attempt, link it now
              // const userCredential =  await this.handlePendingCredentialLinking(response.user)
              // response.user = userCredential?.user || response.user

              if (response.user.displayName || response.user.photoURL) {
                await updateProfile(response.user, {
                  displayName: response.user.displayName,
                  photoURL: response.user.photoURL ? response.user.photoURL : DEFAULT_PROFILE_URL,
                })
              }
              await this.firestoreService.storeUserData(response.user, this.user?.providerId || 'github.com', true, this.user?.username)
              // this.authService.initAuth()

              // refresh providers data instead of re-init whole auth state
              this.loginProviders = this.loginProviders.filter(p => p !== 'github')
              this.remProviders.push('github')
              this.showSnackbar('Github provider linked Sucessfully', SnackBarType.success, '', 3000)
            }
          },
          error: (error) => {
            // this.extractFirebaseError(error)
            // this.handleAccountExistsError(error, 'github.com')
            const errorMessage = getErrorMessage(error)
            this.showSnackbar(errorMessage, SnackBarType.error, '', 5000)
            this.loading.github = false
          },
          complete: () => {
            this.loading.github = false
          }
        }

      )
  }

  protected disconnectProvider(provider: string) {
    // Check if the provider to be unlinked is the currently logged-in provider
    const providerId = (provider !== 'password'? provider + '.com' : 'password')
    if (providerId === this.user?.providerId) {
      this.showSnackbar(
        `Cannot unlink the currently logged-in provider (${provider}).`,
        SnackBarType.error
      )
      return
    }

    if (provider !== 'password')
      this.loading[provider as 'github' | 'google'] = true
    else
      this.loading.email = (provider === 'password')

    from(this.authService.unlinkProvider(providerId))
      .pipe(
        takeUntilDestroyed(this.destroyRef) // Automatically unsubscribe when the component is destroyed
      )
      .subscribe({
        next: async () => {

          // Filter out the current provider from the providerData array
          const updatedProviderData = this.user?.providerData.filter(
            (p) => p.providerId !== providerId
          )

          // update user data in firestore
          if (this.user?.uid) {
            await this.firestoreService.setUserData(this.user.uid, { 
              providerData: updatedProviderData,
              updated_At: new Date() 
            }, true)
          } else {
            this.showSnackbar('User ID is missing.', SnackBarType.error, '', 5000)
          }

          if (updatedProviderData && this.user) {
            this.user = { ...this.user, providerData: updatedProviderData, currProviderData: null }
            this.hasProviderPassword.set({provider: this.user?.providerId || '', has: this.user?.providerData.some(p => p.providerId === 'password') ?? false})
          }
            

          if (provider === 'password')
            return          

          // Update the UI state after successful unlinking
          this.remProviders = this.remProviders.filter(p => p !== provider)
          this.loginProviders.push(provider)
        },
        error: (error) => {
          if (provider !== 'password')
            this.loading[provider as 'github' | 'google'] = false
          else
            this.loading.email = !(provider === 'password')

          // Handle errors and show an error message
          const errorMessage = getErrorMessage(error);
          this.showSnackbar(errorMessage, SnackBarType.error, '', 5000);
        },
        complete: () => {
          if (provider !== 'password')
            this.loading[provider as 'github' | 'google' ] = false
          else
            this.loading.email = !(provider === 'password')
          this.showSnackbar(`${provider} provider disconnected`, SnackBarType.success, '', 3000);
        }
      })
  }

  setPassword() {

    const newPassword = this.password?.value
    if (!newPassword) {
      // this.securityForm.markAllAsTouched()
      // this.cdr.detectChanges()
      return
    }
    const userId = this.user?.uid || '' 
    this.loading.password = true
    from(this.authService.updatePassword(newPassword))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (userCredential) => {

          try {
                if (userCredential)
                  await this.firestoreService.setUserData(userId, { providerData: userCredential.user.providerData, updated_At: new Date() }, true)

                const newUser= await this.authService.refreshUserData(userId)
          
                if (newUser)
                  this.user = newUser
          }
          catch (error) {
            console.error('Error updating user data after password change:', error)
          }
          
         
          this.password?.reset() 
        },
        error: (error) => {
          const errorMessage = getErrorMessage(error)
          this.showSnackbar(errorMessage, SnackBarType.error, '', 5000)
          this.loading.password = false
        },
        complete: () => {
          this.loading.password = false
          this.showSnackbar('Password changed successfully!', SnackBarType.success, '', 3000)
        }
      })
  }

  onSubmit() {

  }


  darkMode() {

    return this.themeDarkMode ? '_dark' : ''

  }


  protected checkPasswordStrength(password: string): string {
      return checkPasswordStrength(password)
  }

  getErrorLabel(controlName: string): string | undefined {
      return getErrorLabel(this.securityForm, controlName)
    }
  


  // 'info' | 'success' | 'warning' | 'error'
  private showSnackbar(
    message: string,
    type: SnackBarType = SnackBarType.info,
    action: string | '' = '',
    duration: number = 3000) {

    this.snackbarService.showSnackbar(message, type, action, duration)
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.

  }

}
