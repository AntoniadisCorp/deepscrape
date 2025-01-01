import { Directive, Input } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator, ValidatorFn } from '@angular/forms';

@Directive({
  selector: '[appForbiddenName]',
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: ForbiddenValidatorDirective,
      multi: true,
    },
  ],
  standalone: true,
})
export class ForbiddenValidatorDirective implements Validator {
  @Input('appForbiddenName') forbiddenName = '';

  validate(control: AbstractControl): ValidationErrors | null {

    return this.forbiddenName
      ? forbiddenNameValidator(new RegExp(this.forbiddenName, 'i'))(control)
      : null;
  }
}

/** A hero's name can't match the given regular expression */
export function forbiddenNameValidator(nameRe: RegExp): ValidatorFn {

  return (control: AbstractControl): ValidationErrors | null => {

    const slicedArray = sliceByPrefix(control.value, ",")
    const isPassed: boolean = slicedArray.every(item => nameRe.test(item)) // passed all strings

    return !isPassed ? { forbiddenName: control.value } : null;
  };
}

export function createPasswordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {

    const value = control.value;

    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]+/.test(value);

    const hasLowerCase = /[a-z]+/.test(value);

    const hasNumeric = /[0-9]+/.test(value);

    const hasSpeciallCharacters = /[@$!%*?&]+/.test(value)

    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpeciallCharacters;

    return !passwordValid ? { passwordStrength: true } : null;
  }
}

function sliceByPrefix(str: string, prefix: string) {
  return str.trim().split(prefix);
}