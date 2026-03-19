import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SizeDetectorComponent } from './size-detector.component';
import { getTestProviders } from 'src/app/testing';

describe('SizeDetectorComponent', () => {
  let component: SizeDetectorComponent;
  let fixture: ComponentFixture<SizeDetectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SizeDetectorComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(SizeDetectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
