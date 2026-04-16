import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileTabComponent } from './profile.component';
import { getTestProviders } from 'src/app/testing';

describe('ProfileTabComponent', () => {
  let component: ProfileTabComponent;
  let fixture: ComponentFixture<ProfileTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileTabComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('validateFile should reject unsupported file types', () => {
    const file = new File(['abc'], 'test.txt', { type: 'text/plain' });

    expect(component.validateFile(file)).toBeFalse();
    expect(component.fileError).toContain('Only image files');
  });

  it('validateFile should reject files larger than 5MB', () => {
    const bigContent = new Array(5 * 1024 * 1024 + 1).fill('a').join('');
    const file = new File([bigContent], 'big.png', { type: 'image/png' });

    expect(component.validateFile(file)).toBeFalse();
    expect(component.fileError).toContain('less than 5MB');
  });

  it('validateFile should accept valid image file', () => {
    const file = new File(['img'], 'ok.webp', { type: 'image/webp' });

    expect(component.validateFile(file)).toBeTrue();
    expect(component.fileError).toBeNull();
  });
});
