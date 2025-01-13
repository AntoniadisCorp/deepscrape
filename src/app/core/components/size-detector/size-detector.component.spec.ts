import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SizeDetectorComponent } from './size-detector.component';

describe('SizeDetectorComponent', () => {
  let component: SizeDetectorComponent;
  let fixture: ComponentFixture<SizeDetectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SizeDetectorComponent]
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
