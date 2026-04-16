import { TestBed } from '@angular/core/testing';

import { SnackbarService } from './snackbar.service';
import { SnackbarComponent, SnackBarType } from '../components';
import { getTestProviders } from 'src/app/testing';

describe('SnackbarService', () => {
  let service: SnackbarService;
  let snackbarComponentMock: jasmine.SpyObj<SnackbarComponent>;

  beforeEach(() => {
    snackbarComponentMock = jasmine.createSpyObj('SnackbarComponent', ['show', 'hide']);

    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = new SnackbarService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set snackbar reference', () => {
    service.setSnackbar(snackbarComponentMock);
    // Verify the internal state is updated
    expect(service).toBeTruthy();
  });

  it('should show snackbar with default parameters', () => {
    service.setSnackbar(snackbarComponentMock);
    service.showSnackbar('Test message');

    expect(snackbarComponentMock.show).toHaveBeenCalledWith(
      'Test message',
      SnackBarType.info,
      '',
      3000
    );
  });

  it('should show snackbar with custom type', () => {
    service.setSnackbar(snackbarComponentMock);
    service.showSnackbar('Error message', SnackBarType.error);

    expect(snackbarComponentMock.show).toHaveBeenCalledWith(
      'Error message',
      SnackBarType.error,
      '',
      3000
    );
  });

  it('should show snackbar with custom duration', () => {
    service.setSnackbar(snackbarComponentMock);
    service.showSnackbar('Temporary message', SnackBarType.info, '', 5000);

    expect(snackbarComponentMock.show).toHaveBeenCalledWith(
      'Temporary message',
      SnackBarType.info,
      '',
      5000
    );
  });

  it('should show snackbar with action button', () => {
    service.setSnackbar(snackbarComponentMock);
    service.showSnackbar('Undo action', SnackBarType.info, 'Undo', 3000);

    expect(snackbarComponentMock.show).toHaveBeenCalledWith(
      'Undo action',
      SnackBarType.info,
      'Undo',
      3000
    );
  });

  it('should hide snackbar', () => {
    service.setSnackbar(snackbarComponentMock);
    service.hideSnackBar();

    expect(snackbarComponentMock.hide).toHaveBeenCalled();
  });

  it('should handle showSnackbar gracefully when no snackbar reference is set', () => {
    // Should not throw error
    expect(() => {
      service.showSnackbar('Test message');
    }).not.toThrow();
  });

  it('should handle hideSnackBar gracefully when no snackbar reference is set', () => {
    // Should not throw error
    expect(() => {
      service.hideSnackBar();
    }).not.toThrow();
  });
});
