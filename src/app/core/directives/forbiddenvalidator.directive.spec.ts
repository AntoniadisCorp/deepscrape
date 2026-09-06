import { FormControl } from '@angular/forms';
import { ForbiddenValidatorDirective, forbiddenNameValidator } from './forbiddenvalidator.directive';

describe('ForbiddenvalidatorDirective', () => {
  it('returns null when no forbiddenName regex is configured', () => {
    const directive = new ForbiddenValidatorDirective();
    directive.forbiddenName = '';

    expect(directive.validate(new FormControl('any value'))).toBeNull();
  });

  it('returns null when all comma-separated values match regex', () => {
    const directive = new ForbiddenValidatorDirective();
    directive.forbiddenName = '^https?:\\/\\/.+';

    const control = new FormControl('https://a.com,http://b.com');
    expect(directive.validate(control)).toBeNull();
  });

  it('returns forbiddenName error when at least one value fails regex', () => {
    const validator = forbiddenNameValidator(/^https?:\/\/.+/i);
    const control = new FormControl('https://a.com,not-a-url');

    expect(validator(control)).toEqual({ forbiddenName: 'https://a.com,not-a-url' });
  });
});
