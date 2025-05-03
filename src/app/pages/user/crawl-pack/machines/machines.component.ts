import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AppDockerStepperComponent, RadioButtonComponent, SlideInModalComponent } from 'src/app/core/components';
import { RippleDirective, TooltipDirective } from 'src/app/core/directives';
import { LocalStorage } from 'src/app/core/services';
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
    modalOpened: boolean = false
    protected isModalOpen: FormControl<boolean>
    protected isModalLoading: { modal: boolean, visibility: { [key: string]: boolean } }
    protected newMachineName: FormControl<string>
    protected currentStep = 1

    protected isStepValid_: boolean = false

    protected isDeploying: boolean = false

    machines: any[] = []
    createMachineForm: any;

    constructor(private formBuilder: FormBuilder, private cdr: ChangeDetectorRef) {
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
        this.currentStep = currentStep
        if (this.currentStep > 4) {
            this.isDeploying = false
            this.isModalOpen.setValue(this.isDeploying)
        }
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
        this.dockerStepper.deploy()
    }

    themeIsDark() {

        return this.localStorage?.getItem(themeStorageKey) === 'true'
    }
}
