import { NgIf } from '@angular/common';
import { Component, forwardRef, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-preview-image',
  imports: [ReactiveFormsModule, NgIf],
  templateUrl: './preview-image.component.html',
  styleUrl: './preview-image.component.scss',
    providers: [
      {
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => PreviewImageComponent),
        multi: true,
      },
    ],
})
export class PreviewImageComponent {
@Input() value: string | ArrayBuffer | null = null;
   onChange = (value: any) => {};
  onTouched = () => {};

  writeValue(value: any): void {
    this.value = value
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
}
