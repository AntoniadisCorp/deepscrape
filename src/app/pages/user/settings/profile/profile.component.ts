import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core'
import { CommonModule, DatePipe, JsonPipe, NgClass, NgIf } from '@angular/common'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { FirestoreService, LocalStorage, SnackbarService } from 'src/app/core/services'
import { DropdownComponent, SnackBarType, StinputComponent } from 'src/app/core/components'
import { FormControlPipe, ProviderPipe } from 'src/app/core/pipes'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core'
import { extractNames, fileToBase64, formatBytes } from 'src/app/core/functions'
import { DropDownOption, ProfileStatus, UserDetails, Users, UserSocialLinks } from 'src/app/core/types'
import { UserInfo } from '@angular/fire/auth'
import { ActivatedRoute } from '@angular/router'
import { ImageSrcsetDirective, RippleDirective } from 'src/app/core/directives'
import { themeStorageKey } from 'src/app/shared'
import { from, take } from 'rxjs'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'


@Component({
  selector: 'app-profile-tab',
  imports: [StinputComponent, FormControlPipe, DatePipe,
    NgIf, ReactiveFormsModule, NgClass, MatProgressBarModule, ImageSrcsetDirective,
     ProviderPipe, DropdownComponent, RippleDirective, MatProgressSpinnerModule
    ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileTabComponent {

  private destroryRef = inject(DestroyRef)
  private localStorage = inject(LocalStorage)
  private cdRef = inject(ChangeDetectorRef)
  private firestore = inject(FirestoreService)

  private snackbarService = inject(SnackbarService)
  profileForm: FormGroup

  protected user: Users & { currProviderData: UserInfo | null } | null = null
  selectedFile: File | null = null
  previewUrl: string | ArrayBuffer | null = null
  isDragging = false
  isLoadingFile = false
  fileError: string | null = null
  fileSize: string | null = null

  isSaving: boolean = false

  @ViewChild('image', { static: false }) imageInput: ElementRef

  constructor(private route: ActivatedRoute) {
    this.user = this.route.snapshot.data['user']
    console.log('Resolved user data:', this.user)
  }

  engineerStatuses: DropDownOption[] = []

  validateFile(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      this.fileError = 'Only image files of type JPEG, PNG, GIF, SVG, or WEBP are allowed.'
      return false
    }

    if (file.size > 5 * 1024 * 1024) {
      this.fileError = 'File size must be less than 5MB.'
      return false
    }

    this.fileError = null
    return true
  }


  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.initProfileForm()
    this.initPhotoPreview()
  }

  onFileSelected(event: any) {
    this.fileError = null
    if (!event.target.files || event.target.files.length === 0) {
      console.log('No file selected')
      return
    }

    const file = event.target.files[0]
    if (!this.validateFile(file)) {
      this.selectedFile = null
      this.previewUrl = null
      this.fileSize = null
      return
    }

    this.selectedFile = file
    this.fileSize = formatBytes(file.size)
    this.isLoadingFile = true

     // Update the form control value and mark it as dirty
    const photoFileControl = this.profileForm.controls['photoFile']
    photoFileControl.setValue(this.selectedFile)
    photoFileControl.markAsDirty() // Mark the control as dirty
    photoFileControl.markAsTouched() // Optionally mark it as touched

    this.previewFile()
    this.cdRef.detectChanges()
  }


  initProfileForm() {

    this.profileForm = new FormGroup(
      {
      username: new FormControl<string>(this.user?.username || '', {
        updateOn: 'change',
        validators: [
        Validators.required,
        Validators.minLength(4),
        ]
      }),
      displayName: new FormControl<string>('', {
        updateOn: 'change',
        validators: [
        Validators.required,
        Validators.minLength(4),
        ]
      }),
      photoFile: new FormControl<File | null>(new File([], 'myfile'), {
        updateOn: 'change',
        validators: [],
        nonNullable: false
      }),
      bio: new FormControl<string>(this.user?.details?.bio || '', {
        validators: [
        Validators.minLength(0),
        Validators.maxLength(600),
        Validators.pattern(/^[\p{L}\p{N}\s@$%^&*()_+{}\[\]:<>,.?~\\/'!,-]*$/u)

        ]
      }),
      company: new FormControl<string>(this.user?.details?.company || '', {
        validators: [Validators.pattern(/^[a-zA-Z0-9\s!@#$%^&*()_+{}\[\]:<>,.?~\\/-]*$/)]
      }),
      location: new FormControl<string>(this.user?.details?.location || '', {
        validators: [Validators.pattern(/^[a-zA-Z0-9\s!@#$%^&*()_+{}\[\]:<>,.?~\\/-]*$/)]
      }),
      jobTitle: new FormControl<string>(this.user?.details?.jobTitle || '', {
        validators: [Validators.pattern(/^[a-zA-Z0-9\s!@#$%^&*()_+{}\[\]:<>,.?~\\/-]*$/)]
      }),
      socialLinks: new FormGroup({
        twitter: new FormControl<string>(this.user?.details?.socialLinks?.twitter || '', {
        validators: [Validators.pattern(/^(https?:\/\/)?[a-zA-Z0-9_]+$/)]
        }),
        linkedin: new FormControl<string>(this.user?.details?.socialLinks?.linkedin || '', {
        validators: [Validators.pattern(/^(https?:\/\/)?[a-zA-Z0-9-]+$/)]
        }),
        threads: new FormControl<string>(this.user?.details?.socialLinks?.threads || '', {
        validators: [Validators.pattern(/^(https?:\/\/)?[a-zA-Z0-9_]+$/)]
        }),
        github: new FormControl<string>(this.user?.details?.socialLinks?.github || '', {
        validators: [Validators.pattern(/^(https?:\/\/)?[a-zA-Z0-9-]+$/)]
        }),
        website: new FormControl<string>(this.user?.details?.socialLinks?.website || '', {
        validators: [Validators.pattern(/^(https?:\/\/)?([\w-]+(\.[\w-]+)+([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?)$/)]
        }),
        stackoverflow: new FormControl<string>(this.user?.details?.socialLinks?.stackoverflow || '', {
        validators: [Validators.pattern(/^(https?:\/\/)?[a-zA-Z0-9-]+$/)]
        }),
        youtube: new FormControl<string>(this.user?.details?.socialLinks?.youtube || '', {
        validators: [Validators.pattern(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/[A-Za-z0-9_-]+$/)]
        }),
        codepen: new FormControl<string>(this.user?.details?.socialLinks?.codepen || '', {
        validators: [Validators.pattern(/^(https?:\/\/)?[a-zA-Z0-9_-]+$/)]
        }),
      }),
      role: new FormControl<string>('', { nonNullable: false, validators: [] }),
      engineerStatus: new FormControl<DropDownOption>({ name: 'Not selected', code: '0' }, { validators: [], nonNullable: true } ),
      }
    )

    this.engineerStatuses = [
      { name: 'Not selected', code: '0' },
      { name: 'Aspiring engineer (<1 year)', code: '1' },
      { name: 'Entry-level (1 year)', code: '2' },
      { name: 'Mid-level (2-3 years)', code: '3' },
      { name: 'Experienced (4-5 years)', code: '4' },
      { name: 'Highly experienced (6-10 years)', code: '5' },
      { name: 'I\'ve suffered enough (10+ years)', code: '6' },
      { name: 'I am ethical hacker', code: '7' },
      { name: 'I\'m not an engineer', code: '8' }
    ]
    
    // Initialize form with user data if available
    this.patchProfileForm()
  }

  initPhotoPreview() {
    
  console.log('Current provider data:', this.user?.currProviderData)
    
    if (!this.user?.providerId)
      return
  
   this.previewUrl = this.user?.details?.photoURL || this.user?.currProviderData?.photoURL || null
  //  set a default File object to trigger the preview display
  if (this.previewUrl)
    this.profileForm.controls['photoFile'].setValue(new File([], 'profile-pic'), { emitEvent: false }) 
  }

  patchProfileForm() {
    if (!this.user)
      return

    this.usernameEditable()

    let displayName = this.user?.details?.displayName || this.user?.currProviderData?.displayName || ''
    
    this.profileForm.patchValue({
      username: this.user?.username || '',
      displayName,
      engineerStatus: { 
        name: this.user?.details?.engineerStatus || 'Not selected', 
        code: this.engineerStatuses.find( status => status.name === this.user?.details?.engineerStatus )?.code || '0' 
      },
      bio: this.user?.details?.bio || '',
      company: this.user?.details?.company || '',
      location: this.user?.details?.location || '',
      jobTitle: this.user?.details?.jobTitle || '',
      socialLinks: {
        twitter: this.user?.details?.socialLinks?.twitter || '',
        linkedin: this.user?.details?.socialLinks?.linkedin || '',
        threads: this.user?.details?.socialLinks?.threads || '',
        github: this.user?.details?.socialLinks?.github || '',
        website: this.user?.details?.socialLinks?.website || '',
        stackoverflow: this.user?.details?.socialLinks?.stackoverflow || '',
      }
    }, { emitEvent: false })
  }

  private usernameEditable() {
    const usernameControl = this.profileForm.get('username');
    if (this.user?.details?.last_username_change) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      usernameControl?.[this.user.details.last_username_change > sixMonthsAgo ? 'enable' : 'disable']({ emitEvent: false });
    } else {
      usernameControl?.disable({ emitEvent: false });
    }
  }

   getAndFilterConfirmForm() {
      // get form values
      const config = this.profileForm.getRawValue()
      const newConfig = { ...config }; // Create a copy of the config object
      // delete newConfig.title; // Remove the 'title' attribute from the config object
  
  
      // Filter out null, unchanged, or default values
      const filteredConfig: any = Object.keys(newConfig).reduce((acc: any, key) => {
        const formControl = this.profileForm.get(key)
  
        if (formControl && (formControl.dirty || !formControl.pristine) && newConfig[key] !== null && newConfig[key] !== '') {
          if (key === 'engineerStatus')
            acc[key] = newConfig[key]?.name
          else acc[key] = newConfig[key]
        } else if (!formControl && newConfig[key] !== null && newConfig[key] !== '') {
          if (key === 'engineerStatus')
            acc[key] = newConfig[key]?.name
          else acc[key] = newConfig[key]
        }
        // console.log(acc, key)
        return acc
      }, {})
  
      return filteredConfig
    }

  async saveProfile() {

    // validate form
    if (!this.profileForm.valid)
      return

    // loading state
    this.isSaving = true

    // 1. Get username value if changed
    const {username} = this.getAndFilterConfirmForm()

    // 2. Handle file upload if a new file is selected and get the photoURL
    const detailsUpdate: Partial<UserDetails> | null = await this.saveImageAndGetFormData()

    if (!detailsUpdate) {
      this.isSaving = false
      this.cdRef.detectChanges() // Trigger change detection manually
      return
    }

    const localUser = {... this.user}
    delete localUser?.currProviderData // remove currProviderData before saving to Firestore

    // 3. Save to Firestore
    const newUserData: Partial<Users> = {
      ...localUser,
      ...(!!username ? { username } : {}), // Only include username if it is defined
      details: detailsUpdate
    } as Partial<Users>

    const userId = this.user?.uid || ''

    if (!userId) {
      console.error('User ID is missing. Cannot update profile.')
      this.isSaving = false
      this.cdRef.detectChanges() // Trigger change detection manually
      return
    }

    from(this.firestore.setUserData(userId, newUserData, true))
    .pipe(
      takeUntilDestroyed(this.destroryRef)
    ).subscribe({
      next: () => {
        console.log('Profile updated successfully')
        // Reset form state after successful save
        this.profileForm.markAsPristine()
        this.profileForm.markAsUntouched()
        this.usernameEditable()
        
        
        // Optionally, you can also reset the selected file and preview URL as upload is done
        this.previewUrl =  detailsUpdate.photoURL || this.user?.currProviderData?.photoURL || null

        //  set a default File object to trigger the preview display
        if (this.previewUrl)
          this.profileForm.controls['photoFile'].setValue(new File([], 'profile-pic'), { emitEvent: false }) 

        this.selectedFile = null
        this.fileSize = null
      },
      error: (error) => {
        this.isSaving = false
        console.error('Error updating profile:', error)

        const errorMessage = error?.message || 'An unexpected error occurred while updating the profile. Please try again later.'
        this.showSnackbar(errorMessage, SnackBarType.error, '', 5000)
        this.cdRef.detectChanges() // Ensure the view is updated
      },
      complete: () => {
        this.isSaving = false
        this.showSnackbar('Profile updated successfully', SnackBarType.success, '', 3000)
        this.cdRef.detectChanges() // Ensure the view is updated
      }
    })
  }

  private async saveImageAndGetFormData(): Promise<Partial<UserDetails> | null> {

     // 1. Handle file upload if a new file is selected
    const {photoFile} = this.getAndFilterConfirmForm()

    //  
    let detailsUpdate: Partial<UserDetails & { photoFile: File }> = {... this.getAndFilterConfirmForm() as Partial<UserDetails & { photoFile: File }>}
    delete detailsUpdate.photoFile// we handle photoFile separately

    try {
      if (photoFile instanceof File) {

        // convert file to base64
        detailsUpdate.photoURL = await fileToBase64(photoFile) as string

        // upload to firebase storage
        const markDate = Date.now()
        const fileName = `${photoFile.name.split('.').shift()}-${markDate}.${photoFile.type.split('/')[1]}`
        const metadata = { 
            lastModified: photoFile.lastModified, 
            type: photoFile.type, 
            initial_name: photoFile.name, 
            uid: this.user?.uid || '',
            initial_size: photoFile.size,
            uploaded_At: markDate
          }


        const downloadURL = await this.firestore.uploadFileToStorage(detailsUpdate.photoURL, this.user?.uid || '',
           fileName, metadata)

        detailsUpdate.photoURL = downloadURL
      } else {
        detailsUpdate.photoURL = this.user?.details?.photoURL || this.user?.currProviderData?.photoURL || '';
      }
    } catch (error) {
      console.error('Error occured on file uploading: ', error)
      this.showSnackbar('There was an error uploading the profile picture. Please try again.', SnackBarType.error)
      return null
    }

    return detailsUpdate || null
  }

  previewFile() {
    if (this.selectedFile) {
      const reader = new FileReader()
      reader.onload = (e) => {
        this.previewUrl = e.target?.result as string
        this.isLoadingFile = false
      }
      reader.onerror = (error) => {
        console.error('Error reading file:', error)
        this.fileError = 'There was an error reading the file.'
      }
      this.isLoadingFile = true
      reader.readAsDataURL(this.selectedFile)
    
      this.cdRef.detectChanges() // <-- Force view update after async file read
    }
  }

  onEngineerStatusChange(option: Event) {
    const controls = this.profileForm.controls['engineerStatus']
    controls.markAsDirty()
    controls.markAsTouched()
  }

  onDragOver(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
    this.isDragging = true
    this.cdRef.detectChanges()
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
    this.isDragging = false
    this.cdRef.detectChanges()
  }

  onDrop(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
    this.isDragging = false

    const files = event.dataTransfer?.files
    if (files && files.length > 0) {
      const file = files[0]
      if (!this.validateFile(file)) {
        this.selectedFile = null
        this.previewUrl = null
        this.fileSize = null
        return
      }

      this.selectedFile = file
      this.fileSize = formatBytes(file.size)
      this.isLoadingFile = true
      // Update the form control value and mark it as dirty
      const photoFileControl = this.profileForm.controls['photoFile']
      photoFileControl.setValue(this.selectedFile)
      photoFileControl.markAsDirty() // Mark the control as dirty
      photoFileControl.markAsTouched() // Optionally mark it as touched
      
      this.previewFile()
    }
    this.cdRef.detectChanges()
  }

  removeImage() {
    this.selectedFile = null
    this.previewUrl = null
    this.profileForm.controls['photoFile'].setValue(null, { emitEvent: true })
    if (this.imageInput) {
      this.imageInput.nativeElement.value = ''
    }
    this.cdRef.detectChanges()
  }

  themeIsDark(): boolean {
    return this.localStorage.getItem(themeStorageKey) === 'dark'
  }

  showSnackbar(
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
