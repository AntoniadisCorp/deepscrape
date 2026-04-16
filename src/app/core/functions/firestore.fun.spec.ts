import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { AuthErrorCodes } from '@angular/fire/auth';

import { getErrorMessage } from './firestore.fun';
import { getTestProviders } from 'src/app/testing';

describe('firestore.fun', () => {
  let translate: TranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: getTestProviders(),
    });

    translate = TestBed.inject(TranslateService);
  });

  describe('getErrorMessage', () => {
    it('should return translated message for EMAIL_EXISTS error', () => {
      spyOn(translate, 'instant').and.returnValue('Email already exists');

      const error = { code: AuthErrorCodes.EMAIL_EXISTS };
      const message = getErrorMessage(error, translate);

      expect(translate.instant).toHaveBeenCalledWith('AUTH_ERRORS.EMAIL_EXISTS');
      expect(message).toBe('Email already exists');
    });

    it('should return translated message for INVALID_EMAIL error', () => {
      spyOn(translate, 'instant').and.returnValue('Invalid email address');

      const error = { code: AuthErrorCodes.INVALID_EMAIL };
      const message = getErrorMessage(error, translate);

      expect(translate.instant).toHaveBeenCalledWith('AUTH_ERRORS.INVALID_EMAIL');
    });

    it('should handle WEAK_PASSWORD error', () => {
      spyOn(translate, 'instant').and.returnValue('Password is too weak');

      const error = { code: AuthErrorCodes.WEAK_PASSWORD };
      const message = getErrorMessage(error, translate);

      expect(translate.instant).toHaveBeenCalledWith('AUTH_ERRORS.WEAK_PASSWORD');
    });

    it('should handle NETWORK_REQUEST_FAILED error', () => {
      spyOn(translate, 'instant').and.returnValue('Network request failed');

      const error = { code: AuthErrorCodes.NETWORK_REQUEST_FAILED };
      const message = getErrorMessage(error, translate);

      expect(translate.instant).toHaveBeenCalledWith('AUTH_ERRORS.NETWORK_REQUEST_FAILED');
    });

    it('should handle TOO_MANY_ATTEMPTS_TRY_LATER error', () => {
      spyOn(translate, 'instant').and.returnValue('Too many attempts');

      const error = { code: AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER };
      const message = getErrorMessage(error, translate);

      expect(translate.instant).toHaveBeenCalledWith('AUTH_ERRORS.TOO_MANY_ATTEMPTS_TRY_LATER');
    });

    it('should use error message as fallback', () => {
      spyOn(translate, 'instant').and.returnValue('');

      const error = { message: 'Custom error message' };
      const message = getErrorMessage(error, translate);

      expect(message).toBe('');
    });

    it('should handle errors without code or message', () => {
      spyOn(translate, 'instant').and.returnValue('');

      const error = {};
      const message = getErrorMessage(error, translate);

      expect(message).toBe('');
    });

    it('should handle POPUP_CLOSED_BY_USER error', () => {
      spyOn(translate, 'instant').and.returnValue('Popup closed by user');

      const error = { code: AuthErrorCodes.POPUP_CLOSED_BY_USER };
      const message = getErrorMessage(error, translate);

      expect(translate.instant).toHaveBeenCalledWith('AUTH_ERRORS.POPUP_CLOSED_BY_USER');
    });

    it('should handle INVALID_LOGIN_CREDENTIALS error', () => {
      spyOn(translate, 'instant').and.returnValue('Invalid credentials');

      const error = { code: AuthErrorCodes.INVALID_LOGIN_CREDENTIALS };
      const message = getErrorMessage(error, translate);

      expect(translate.instant).toHaveBeenCalledWith('AUTH_ERRORS.INVALID_LOGIN_CREDENTIALS');
    });
  });
});
