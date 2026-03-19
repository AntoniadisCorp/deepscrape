import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SnackbarComponent } from './snackbar.component';
import { getTestProviders } from 'src/app/testing';

describe('SnackbarComponent', () => {
  let component: SnackbarComponent;
  let fixture: ComponentFixture<SnackbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SnackbarComponent],
      providers: getTestProviders(),
    })
      .compileComponents();

    fixture = TestBed.createComponent(SnackbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
