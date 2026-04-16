import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneralTabComponent } from './general.component';
import { getTestProviders } from 'src/app/testing';

describe('GeneralTabComponent', () => {
  let component: GeneralTabComponent;
  let fixture: ComponentFixture<GeneralTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneralTabComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneralTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render General Settings heading', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('General Settings');
  });

  it('should render save action button', () => {
    const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;

    expect(button).toBeTruthy();
    expect(button.textContent?.trim()).toBe('Save');
  });
});
