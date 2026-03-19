import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GinputComponent } from './ginput.component';
import { getTestProviders } from 'src/app/testing';

describe('GinputComponent', () => {
  let component: GinputComponent;
  let fixture: ComponentFixture<GinputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GinputComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(GinputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
