import { TestBed } from '@angular/core/testing';
import { MachinesComponent } from './machines.component';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

describe('MachinesComponent', () => {
  let component: MachinesComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        BrowserAnimationsModule,
        MatIconModule,
        MatProgressSpinnerModule,
      ],
      declarations: [MachinesComponent],
      providers: [
        {
          provide: 'LocalStorage',
          useValue: {
            getItem: (key: string) => null,
            setItem: (key: string, value: string) => { },
            removeItem: (key: string) => { },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(MachinesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should check if theme is dark', () => {
    spyOn(component['localStorage'], 'getItem').and.returnValue('true');
    expect(component.themeIsDark()).toBe(true);
  });
});