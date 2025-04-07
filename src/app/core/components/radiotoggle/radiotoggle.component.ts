import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
    selector: 'app-radiotoggle',
    imports: [ReactiveFormsModule],
    templateUrl: './radiotoggle.component.html',
    styleUrl: './radiotoggle.component.scss'
})
export class RadioToggleComponent {

  @Input() control: FormControl<boolean>
  @Input() title?: string

  @Input() identity?: string


  constructor() { }


  setTitle(): string {

    if (!this.title)
      return this.control.value ? 'On' : 'Off'

    const format: string[] | undefined = this.title?.split('/')

    return this.control.value ? format[0] : format[1]

  }

}
