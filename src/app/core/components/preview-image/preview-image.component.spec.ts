import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreviewImageComponent } from './preview-image.component';

describe('PreviewImageComponent', () => {
  let component: PreviewImageComponent;
  let fixture: ComponentFixture<PreviewImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreviewImageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreviewImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
