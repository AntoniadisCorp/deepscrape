import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  ChangeDetectionStrategy,
  Output,
  QueryList,
  ViewChildren,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DOCUMENT } from '@angular/common';

const OTP_LENGTH = 6;

@Component({
  selector: 'app-otp-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => OtpInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="flex justify-center gap-2">
      @for (digit of digits; track $index) {
        <input
          #digitInput
          type="text"
          inputmode="numeric"
          maxlength="1"
          [value]="digit"
          (input)="onInput($event, $index)"
          (keydown)="onKeydown($event, $index)"
          (paste)="onPaste($event)"
          (focus)="onFocus($index)"
          class="w-11 h-14 text-center text-xl font-bold rounded-lg border-2 border-gray-400 dark:border-gray-600 bg-white/10 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:border-purple-500 focus:outline-none transition-colors duration-150"
          [attr.aria-label]="'Digit ' + ($index + 1) + ' of ' + otpLength"
          autocomplete="one-time-code"
        />
      }
    </div>
  `,
})
export class OtpInputComponent implements ControlValueAccessor {
  @ViewChildren('digitInput') digitInputs!: QueryList<ElementRef<HTMLInputElement>>;
  @Output() completed = new EventEmitter<string>();

  readonly otpLength = OTP_LENGTH;
  digits: string[] = Array(OTP_LENGTH).fill('');

  private document = inject(DOCUMENT);
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    const str = value ?? '';
    this.digits = Array(OTP_LENGTH)
      .fill('')
      .map((_, i) => str[i] ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(-1); // only last digit
    this.digits[index] = value;
    input.value = value;

    if (value && index < OTP_LENGTH - 1) {
      this.focusInput(index + 1);
    }
    this.emit();
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      if (this.digits[index]) {
        this.digits[index] = '';
        (event.target as HTMLInputElement).value = '';
        this.emit();
      } else if (index > 0) {
        this.focusInput(index - 1);
        const prev = this.digitInputs.toArray()[index - 1]?.nativeElement;
        if (prev) {
          this.digits[index - 1] = '';
          prev.value = '';
          this.emit();
        }
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      this.focusInput(index - 1);
    } else if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      this.focusInput(index + 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '');
    if (!pasted) return;

    for (let i = 0; i < OTP_LENGTH; i++) {
      this.digits[i] = pasted[i] ?? '';
    }

    // Sync native input values
    const inputs = this.digitInputs.toArray();
    inputs.forEach((el, i) => {
      el.nativeElement.value = this.digits[i];
    });

    const nextEmpty = this.digits.findIndex(d => d === '');
    this.focusInput(nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty);
    this.emit();
  }

  onFocus(index: number): void {
    this.onTouched();
    // If there are empty digits before this one, focus the first empty one instead
    const firstEmpty = this.digits.findIndex(d => d === '');
    if (firstEmpty !== -1 && firstEmpty < index) {
      this.focusInput(firstEmpty);
    }
  }

  private focusInput(index: number): void {
    const el = this.digitInputs?.toArray()[index]?.nativeElement;
    el?.focus();
  }

  private emit(): void {
    const value = this.digits.join('');
    this.onChange(value);
    if (value.length === OTP_LENGTH && !this.digits.includes('')) {
      this.completed.emit(value);
    }
  }
}
