import { CommonModule, DatePipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, model, Output, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { startSuspendAnimation } from 'src/app/animations';
import { FlyMachine } from '../../types';
import { FormatBytesPipe } from '../../pipes';
import { DeploymentService } from '../../services';
import { MACHNINE_STATE } from '../../enum';


@Component({
  selector: 'app-container-box',
  imports: [
    MatIcon, DatePipe, NgIf, FormatBytesPipe
  ],
  templateUrl: './container-box.component.html',
  styleUrl: './container-box.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [startSuspendAnimation]
})
export class ContainerBoxComponent {

  startButton = signal<boolean>(false)
  stopButton = signal<boolean>(false) // model.required<boolean>()
  @Input() machine: FlyMachine

  @Output() startPressed = new EventEmitter<{ id: string, laststate: string, instance_id: string }>()
  @Output() suspendPressed = new EventEmitter<{ id: string, laststate: string, instance_id: string }>()
  @Output() stopPressed = new EventEmitter<{ id: string, laststate: string, instance_id: string }>()
  @Output() destroyPressed = new EventEmitter<{ id: string, laststate: string, instance_id: string }>()

  constructor(private cdr: ChangeDetectorRef, private deployService: DeploymentService) { }

  ngAfterViewInit(): void {
    //Called after every check of the component's view. Applies to components only.
    //Add 'implements AfterViewChecked' to the class.

    this.switchState()
    this.cdr.detectChanges()
  }
  get name() {
    return this.machine.name
  }
  get description() {
    return this.machine.description
  }


  /* Actions */
  protected start() {

    if (!this.startButton()) {
      this.startPressed.emit({ id: this.machine.id, laststate: this.machine.state, instance_id: this.machine.instance_id })
      this.stopButton.set(true)
    } else {
      this.suspendPressed.emit({ id: this.machine.id, laststate: this.machine.state, instance_id: this.machine.instance_id })
      this.stopButton.set(true)
    }

    this.startButton.set(!this.startButton())
  }

  protected destroy() {
    this.destroyPressed.emit({ id: this.machine.id, laststate: this.machine.state, instance_id: this.machine.instance_id })
  }

  protected stop() {
    this.stopButton.set(false)
    this.startButton.set(false)
    this.machine.state = 'stopping'

    // emit stop event
    this.stopPressed.emit({ id: this.machine.id, laststate: this.machine.state, instance_id: this.machine.instance_id })
    this.cdr.detectChanges()
  }

  switchState() {
    switch (this.machine.state) {
      case MACHNINE_STATE.CREATED:
        this.startButton.set(true)
        this.stopButton.set(false)
        break;
      case MACHNINE_STATE.STARTED:
        this.startButton.set(true)
        this.stopButton.set(true)
        break;
      case MACHNINE_STATE.SUSPENDED:
        this.startButton.set(false)
        this.stopButton.set(true)
        break;
      case 'stopping':
        break;
      case MACHNINE_STATE.STOPPED:
        this.startButton.set(false)
        this.stopButton.set(false)
        break;
      default:
        break;
    }
  }
  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.

    this.startPressed?.complete()
    this.suspendPressed?.complete()
    this.stopPressed?.complete()
    this.destroyPressed?.complete()
  }
}
