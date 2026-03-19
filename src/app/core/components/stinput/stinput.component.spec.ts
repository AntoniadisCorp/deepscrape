import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StinputComponent } from './stinput.component';
import { getTestProviders } from 'src/app/testing';

describe('StinputComponent', () => {
  let component: StinputComponent;
  let fixture: ComponentFixture<StinputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StinputComponent],
      providers: getTestProviders(),
    })
      .compileComponents();

    fixture = TestBed.createComponent(StinputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
