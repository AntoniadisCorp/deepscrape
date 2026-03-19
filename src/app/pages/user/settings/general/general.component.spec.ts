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
});
