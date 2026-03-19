import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CPackComponent } from './cpack.component';
import { getTestProviders } from 'src/app/testing';

describe('CPackComponent', () => {
  let component: CPackComponent;
  let fixture: ComponentFixture<CPackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CPackComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(CPackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
