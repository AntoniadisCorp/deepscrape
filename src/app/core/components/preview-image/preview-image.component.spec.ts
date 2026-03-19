import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreviewImageComponent } from './preview-image.component';
import { getTestProviders } from 'src/app/testing';

describe('PreviewImageComponent', () => {
  let component: PreviewImageComponent;
  let fixture: ComponentFixture<PreviewImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreviewImageComponent],
      providers: getTestProviders(),
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
