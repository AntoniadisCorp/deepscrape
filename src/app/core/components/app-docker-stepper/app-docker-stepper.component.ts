import { JsonPipe, NgFor, NgIf } from '@angular/common'
import { Component, EventEmitter, inject, Output } from '@angular/core'
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms'
import { MatIcon } from '@angular/material/icon'
import { RadioButtonComponent } from '../radio-button/radio-button.component'
import { FormControlPipe } from '../../pipes'
import { DropdownComponent } from '../dropdown/dropdown.component'
import { DropDownOption } from '../../types'
import { preSetRegions, setAutoContainerOptions, setDefaultImages, setExistingMachines } from '../../functions'
import { cloneMachineValidator } from '../../directives'
import { CheckboxComponent } from '../checkbox/checkbox.component'



@Component({
  selector: 'app-docker-stepper',
  imports: [NgIf, ReactiveFormsModule, NgFor, JsonPipe, MatIcon, RadioButtonComponent,
    FormControlPipe, DropdownComponent, CheckboxComponent
  ],
  templateUrl: './app-docker-stepper.component.html',
  styleUrl: './app-docker-stepper.component.scss'
})
export class AppDockerStepperComponent {
  private fb: FormBuilder = inject(FormBuilder)
  @Output() stepStatus: EventEmitter<number> = new EventEmitter<number>()
  currentStep = 1
  totalSteps = 4

  // Form groups for each step
  formStep1: FormGroup
  formStep2: FormGroup
  formStep3: FormGroup

  // File variable for Dockerfile
  dockerfileFile: File | null = null

  // Mock data (replace with API calls in production)
  defaultImages: DropDownOption[] = []
  existingMachines: DropDownOption[] = []
  regions: DropDownOption[] = []
  autoContainerOptions: DropDownOption[] = []
  isDeploying = false

  constructor() { }

  ngOnInit() {

    // preSet default images
    setDefaultImages(this.defaultImages)

    // preSet existing machines
    setExistingMachines(this.existingMachines)

    // preset Regions
    preSetRegions(this.regions)

    // preSet autoContainerOptions
    setAutoContainerOptions(this.autoContainerOptions)

    // Initialize forms
    this.initForms()

    // Emit Step Status to the parent component
    this.stepStatus.emit(this.currentStep)
  }
  /**
   * comment initForms
   * @description Inits forms
   */
  private initForms() {

    /* Set Step 1 */
    this.formStep1 = this.fb.group({
      imageOption: this.fb.control('default', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      defaultImage: this.fb.control(this.defaultImages[0], {
        nonNullable: true,
        validators: [Validators.required]
      }) as FormControl<DropDownOption>,
      cloneMachine: this.fb.control({}, {
        nonNullable: true,
        validators: [
          Validators.required,
          cloneMachineValidator()
        ]
      }) as FormControl<DropDownOption>,
      dockerfile: this.fb.control(null,
        {
          nonNullable: false,
          validators: [
            this.dockerfileValidator()
          ]
        }) as FormControl<string | null>,
      dockerHubUrl: this.fb.control('', {
        validators: [Validators.required, Validators.pattern(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/)],
      }),
    })

    /* Set Step 2 */
    this.formStep2 = this.fb.group({
      machineName: ['', Validators.required],
      region: this.fb.control(this.regions[0], {
        nonNullable: true,
        validators: [Validators.required]
      }) as FormControl<DropDownOption>,
      cpuCores: [1, [Validators.required, Validators.min(1)]],
      memory: [256, [Validators.required, Validators.min(256)]],
      autoStart: [false],
      autoStop: this.fb.control(this.autoContainerOptions[0], { validators: [Validators.required] }),
      environmentVariables: this.fb.array([]),
    })

    /* Set Step 3 */
    this.formStep3 = this.fb.group({
      flyToml: [''],
    })


    this.formStep1.get('imageOption')?.valueChanges.subscribe((value) => {
      this.updateStep1Validators(value)
    })
    this.updateStep1Validators('default')
  }
  // Custom validator for Dockerfile (must be named "Dockerfile")
  dockerfileValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value && this.dockerfileFile?.name !== 'Dockerfile') {
        return { invalidDockerfile: 'File must be named "Dockerfile"' };
      }
      return null
    };
  }

  updateStep1Validators(option: string | null | undefined) {
    const controls = {
      defaultImage: this.formStep1.get('defaultImage'),
      cloneMachine: this.formStep1.get('cloneMachine'),
      dockerfile: this.formStep1.get('dockerfile'),
      dockerHubUrl: this.formStep1.get('dockerHubUrl'),
    };

    Object.values(controls).forEach((control) => control?.clearValidators());
    if (option === 'default') controls.defaultImage?.setValidators(Validators.required)
    else if (option === 'clone') controls.cloneMachine?.setValidators([Validators.required, cloneMachineValidator()])
    else if (option === 'upload') controls.dockerfile?.setValidators(this.dockerfileValidator())
    else if (option === 'url') controls.dockerHubUrl?.setValidators([Validators.required, Validators.pattern(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/)])

    Object.values(controls).forEach((control) => control?.updateValueAndValidity())
  }

  // Environment variables FormArray
  get environmentVariables() {
    return this.formStep2.get('environmentVariables') as FormArray
  }

  addEnvVar() {
    this.environmentVariables.push(
      this.fb.group({
        key: ['', Validators.required],
        value: ['', Validators.required],
      })
    )
  }

  removeEnvVar(index: number) {
    this.environmentVariables.removeAt(index)
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.dockerfileFile = input.files?.[0] || null;
    this.formStep1.patchValue({ dockerfile: this.dockerfileFile ? 'selected' : null });
    this.formStep1.get('dockerfile')?.updateValueAndValidity()
  }

  getConfiguration() {
    return {
      imageOption: this.formStep1.value.imageOption,
      defaultImage: this.formStep1.value.defaultImage,
      cloneMachine: this.formStep1.value.cloneMachine,
      dockerfile: this.dockerfileFile,
      dockerHubUrl: this.formStep1.value.dockerHubUrl,
      machineName: this.formStep2.value.machineName,
      region: this.formStep2.value.region,
      cpuCores: this.formStep2.value.cpuCores,
      memory: this.formStep2.value.memory,
      autoStart: this.formStep2.value.autoStart,
      autoStop: this.formStep2.value.autoStop,
      environmentVariables: this.formStep2.value.environmentVariables,
      flyToml: this.formStep3.value.flyToml,
      apiJson: this.formStep3.value.apiJson,
    }
  }

  clearCurrStepInput() {
    switch (this.currentStep) {
      case 1:
        this.formStep1.reset()
        this.formStep1.get('imageOption')?.setValue('default')
        this.updateStep1Validators('default')
        break
      case 2:
        this.formStep2.reset()
        // Add specific reset logic for step 2 if needed
        break
      case 3:
        this.formStep3.reset()
        // Add specific reset logic for step 3 if needed
        break
      default:
        // Handle invalid or unknown step
        console.error('Invalid step')
    }
    this.dockerfileFile = null
  }

  nextStep() {

    if (this.currentStep === 1 && this.isStepValid(this.currentStep)) {
      // Reset all fields except imageOption, clear pristine/touched states
      /* const imageOption = this.formStep1.value.imageOption;
      this.formStep1.reset({ imageOption });
      this.dockerfileFile = null;
      Object.keys(this.formStep1.controls).forEach((key) => {
        const control = this.formStep1.get(key);
        control?.markAsUntouched();
        control?.markAsPristine();
      })
      this.updateStep1Validators(imageOption) */
      this.currentStep++;
    } else if (this.currentStep < this.totalSteps && this.isStepValid(this.currentStep)) {
      this.currentStep++
    }

    this.stepStatus.emit(this.currentStep)
  }

  prevStep(setStep?: number) {

    if (this.currentStep > 1) this.currentStep--
    this.stepStatus.emit(this.currentStep)
  }

  isStepValid(step: number): boolean {
    if (step === 1) {
      return (
        this.formStep1.valid &&
        (this.formStep1.value.imageOption !== 'upload' || this.dockerfileFile?.name === 'Dockerfile')
      )
    } else if (step === 2) {
      return this.formStep2.valid
    } else if (step === 3) {
      return true // Optional step
    }
    return false
  }

  deploy() {
    this.isDeploying = true
    const config = this.getConfiguration()
    const formData = new FormData()
    for (const key in config) {
      if (key === 'dockerfile' && config[key]) {
        formData.append('dockerfile', config[key] as File)
      } else if (key === 'environmentVariables') {
        formData.append('environmentVariables', JSON.stringify(config[key]))
      } else {
        formData.append(key, String(config[key as keyof typeof config]))
      }
    }

    /* this.http.post('/deploy', formData).subscribe({
      next: (response) => {
        console.log('Deployed:', response)
        this.isDeploying = false
      },
      error: (error) => {
        console.error('Deploy failed:', error)
        this.isDeploying = false
      },
    }) */
  }

  onCheckBoxChange() {
    // console.log(this.formStep2.get("autoStart")?.value)
    // this.this.formStep2.get("autoStart").setValue(!this.this.formStep2.get("autoStart").value)
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.stepStatus.complete()
  }
}
