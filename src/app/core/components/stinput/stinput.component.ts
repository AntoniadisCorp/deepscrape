import { ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-stinput',
  standalone: true,
  imports: [CommonModule, CommonModule, ReactiveFormsModule/* , ForbiddenValidatorDirective */, MatIcon],
  templateUrl: './stinput.component.html',
  styleUrl: './stinput.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StinputComponent {

  inputFocused: boolean
  Placeholder: string
  onDestroy: Function

  invalidCount: number = 0

  @Input() control: FormControl<string>
  @Input() label?: string = ''
  @Input() leftIcon?: string = ''
  @Input() rightIcon?: string = ''

  @Input() outlined?: boolean = false
  @Input() errorLabel?: string = ''


  @ViewChild('stInput', { static: true }) stInput: ElementRef<HTMLInputElement> = {} as ElementRef;
  constructor() { }

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.

    this.Placeholder = ' '
    this.inputFocused = false

    this.control.statusChanges.subscribe(value => {

      value === 'INVALID' ? this.invalidCount++ : ''
    })
  }





  doValidation() {



  }


  doFocus() {


    this.inputFocused = true
    // this.validation.emit({ invalid: this.control.invalid, value: this.control.value })
    this.Placeholder = ''
  }

  focus() {
    this.stInput.nativeElement.focus()
  }


  // do Blur and clear Placeholder
  doBlur() {
    this.stInput.nativeElement.blur()
    this.inputFocused = false
    this.Placeholder = " "
  }


  togglePasswordVisibility() {



    if (this.isLabelPassword()) {
      this.rightIcon = this.rightIcon == 'visibility' ? 'visibility_off' : 'visibility'
      this.stInput.nativeElement.type = this.stInput.nativeElement.type === 'password' ? 'text' : 'password';
    }

  }

  isLabelPassword(): boolean {

    return this.label == 'Password'
  }


  getRightIconClass() {

    const textColor = this.inputFocused ? 'dark:text-gray-100' : 'dark:text-gray-500'
    const cursor_pointer = this.isLabelPassword() ? 'cursor-pointer' : 'pointer-events-none'

    // add an extra additional class
    const extraIconClass = ` ${textColor} ${cursor_pointer}`

    return extraIconClass
  }

  private get query() { return this.stInput.nativeElement.value; }
  private set query(value: string) { this.stInput.nativeElement.value = value; }

  ngOnDestroy(): void {

  }
}
