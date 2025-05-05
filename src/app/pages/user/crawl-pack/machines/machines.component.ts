import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs/internal/Subscription';
import { AppDockerStepperComponent, RadioButtonComponent, SlideInModalComponent, SnackBarType } from 'src/app/core/components';
import { RippleDirective, TooltipDirective } from 'src/app/core/directives';
import { DeploymentService, LocalStorage, SnackbarService } from 'src/app/core/services';
import { themeStorageKey } from 'src/app/shared';

@Component({
    selector: 'app-machines',
    imports: [NgFor, DatePipe, NgClass, NgIf, ReactiveFormsModule, MatIcon, SlideInModalComponent,
        RippleDirective, TooltipDirective, AppDockerStepperComponent, MatProgressSpinner
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './machines.component.html',
    styleUrl: './machines.component.scss'
})
export class MachinesComponent {
    @ViewChild(AppDockerStepperComponent, { static: false }) dockerStepper: AppDockerStepperComponent
    private localStorage: Storage = inject(LocalStorage)
    private deploySub: Subscription
    modalOpened: boolean = false
    protected isModalOpen: FormControl<boolean>
    protected isModalLoading: { modal: boolean, visibility: { [key: string]: boolean } }
    protected newMachineName: FormControl<string>
    protected currentStep = signal(1)

    protected isStepValid_: boolean = false

    protected isDeploying: boolean = false

    machines: any[] = []
    createMachineForm: any;

    constructor(
        private formBuilder: FormBuilder,
        private deployService: DeploymentService,
        private snackbarService: SnackbarService,
    ) {
    }

    ngOnInit(): void {
        //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
        //Add 'implements OnInit' to the class.
        this.isModalLoading = { modal: false, visibility: {} }

        this.isModalOpen = new FormControl(false, { nonNullable: true })

        this.createMachineForm = this.formBuilder.group({
            name: [''],
            cpu: [0],
            memory: [0],
            network: ['public'],
            performance: ['Shared'],
            image: ['default']
        })
        // this.newMachineName = new FormControl<string>('', { nonNullable: true, validators: [Validators.required] })

    }

    ngAfterViewInit(): void {
        //Called after ngAfterContentInit when the component's view has been initialized. Applies to components only.
        //Add 'implements AfterViewInit' to the class.
        // this.isStepValid_ = this.isStepValid(this.currentStep)
    }

    /* Machine Actions */
    createMachine(): void {

        // this.modalOpened = !this.modalOpened

        // this.showSettings = this.newProfileOpened

        // reset saving state
        // this.savingNewContainer = false

        this.isModalOpen.setValue(true)

        // reset form to default values
        this.createMachineForm.reset()

        // Implement your machine creation logic here
        // console.log(this.createMachineForm.value)
    }

    startStopMachine(machine: any): void {
        // Implement your machine start/stop logic here
        machine.status = machine.status === 'Running' ? 'Stopped' : 'Running';
    }

    openMenuDropdown(machine: any): void {
        // Implement your menu dropdown logic here
    }

    editMachine(machine: any): void {
        // Implement your edit machine logic here
    }

    deleteMachine(machine: any): void {
        // Implement your delete machine logic here
    }

    suspendMachine(machine: any): void {
        // Implement your suspend machine logic here
        machine.status = 'Suspended';
    }

    autoSuspendMachine(machine: any): void {
        // Implement your auto-suspend machine logic here
    }

    /* Modal Functions */
    clearInput() {
        // this.newMachineName.setValue('')
        this.dockerStepper.clearCurrStepInput()
    }

    getCurrentStepByEvent(currentStep: number) {
        if (currentStep > 4) {
            this.isDeploying = false
        }
        return currentStep + 1
    }

    isStepValid(step: number) {
        const isValid = this.dockerStepper?.isStepValid(step)
        // this.cdr.detectChanges()
        return isValid
    }

    prevStep() {
        this.dockerStepper.prevStep()
    }

    nextStep() {
        this.dockerStepper.nextStep()
    }

    deploy() {
        this.isDeploying = true
        this.deploySub = this.dockerStepper.deploy().subscribe({
            next: (response) => {
                this.currentStep.update(this.getCurrentStepByEvent)
                this.isModalOpen.setValue(false)
                console.log('Deployed:', response)
                this.showSnackbar('Deployment successful', SnackBarType.success, '', 5000)
            },
            error: (error) => {
                this.showSnackbar('Deployment failed', SnackBarType.error, '', 5000)
                console.error('Deploy failed:', error)
            },
            complete: () => { this.isDeploying = false },
        })
    }

    themeIsDark() {

        return this.localStorage?.getItem(themeStorageKey) === 'true'
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
        this.deploySub?.unsubscribe()
    }
}
