import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule, DatePipe, NgClass, NgIf } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from 'src/app/core/services';
import { StinputComponent } from 'src/app/core/components';
import { FormControlPipe } from 'src/app/core/pipes';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { formatBytes } from 'src/app/core/functions';


@Component({
  selector: 'app-profile-tab',
  standalone: true,
  imports: [StinputComponent, FormControlPipe, DatePipe, 
    NgIf, ReactiveFormsModule, NgClass, MatProgressBarModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileTabComponent {

  private cdRef = inject(ChangeDetectorRef);

  private authService = inject(AuthService)
  profileForm: FormGroup

  selectedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;
  isDragging = false;
  isLoadingFile = false;
  fileError: string | null = null;
  fileSize: string | null = null;

  @ViewChild('image', { static: false }) imageInput: ElementRef;

  constructor() { }

  protected get username() { return this.profileForm.get('username') as FormControl; }
  protected get firstname() { return this.profileForm.get('firstname') as FormControl; }
  protected get lastname() { return this.profileForm.get('lastname') as FormControl; }
  protected get photoUrl() { return this.profileForm.get('photoUrl') as FormControl }
  protected get role() { return this.profileForm.get('role') as FormControl; }

  validateFile(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.fileError = 'Only image files of type JPEG, PNG, GIF, SVG, or WEBP are allowed.';
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.fileError = 'File size must be less than 5MB.';
      return false;
    }

    this.fileError = null;
    return true;
  }


  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.initProfileForm();
  }

  onFileSelected(event: any) {
    this.fileError = null;
    if (!event.target.files || event.target.files.length === 0) {
      console.log('No file selected');
      return;
    }

    const file = event.target.files[0];
    if (!this.validateFile(file)) {
      this.selectedFile = null;
      this.previewUrl = null;
      this.fileSize = null;
      return;
    }

    this.selectedFile = file;
    this.fileSize = formatBytes(file.size);
    this.isLoadingFile = true;
    this.profileForm.controls['photoUrl'].setValue(this.selectedFile);
    this.previewFile();
  }


  initProfileForm() {
    this.profileForm = new FormGroup(
      {
        username: new FormControl<string>('', {
          updateOn: 'change', //default will be change
          validators: [
            Validators.required,
            Validators.minLength(4),
            // forbiddenNameValidator(/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[^\s]*)?$/i)
          ]
        }),
        firstname: new FormControl<string>('', {
          updateOn: 'change', //default will be change
          validators: [
            Validators.required,
            Validators.minLength(4),
            // forbiddenNameValidator(/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[^\s]*)?$/i)
          ],
        },
        ),

        lastname: new FormControl<string>('', {
          updateOn: 'change', //default will be change
          validators: [
            Validators.required,
            Validators.minLength(4),

          ]
        }),

        photoUrl: new FormControl<File | null>(null),
        role: new FormControl<string>(''),
      }
    )
  }


  onSubmit(): void {
    if (!this.profileForm.valid)
      return


    /* this.authorizeService.updateProfile(this.profileForm.value).subscribe({
        next: (response: any) => {
          console.log('Profile updated successfully', response);
          // Handle success (e.g., show a success message)
        },
        error: (error: any) => {
          console.error('Error updating profile', error);
          // Handle error (e.g., show an error message)
        }
      }); */
  }

  previewFile() {
    if (this.selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result as string;
        this.isLoadingFile = false;
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        this.fileError = 'There was an error reading the file.';
      }
      this.isLoadingFile = true;
      reader.readAsDataURL(this.selectedFile)
    
      this.cdRef.detectChanges() // <-- Force view update after async file read
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
    if (!this.validateFile(file)) {
      this.selectedFile = null;
      this.previewUrl = null;
      this.fileSize = null
      return;
    }

    this.selectedFile = file;
    this.fileSize = formatBytes(file.size);
    this.isLoadingFile = true;
    this.profileForm.controls['photoUrl'].setValue(this.selectedFile);
      this.previewFile();
    }
    this.cdRef.detectChanges();
  }

  removeImage() {
    this.selectedFile = null;
    this.previewUrl = null;
    this.profileForm.controls['photoUrl'].setValue(null);
    if (this.imageInput) {
      this.imageInput.nativeElement.value = '';
    }
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.

  }
}
