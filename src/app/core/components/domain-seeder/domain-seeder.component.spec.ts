import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AsyncPipe, NgClass } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { DomainSeederComponent } from './domain-seeder.component';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { SeederResultsComponent } from '../seeder-results/seeder-results.component';
import { getTestProviders } from 'src/app/testing';

describe('DomainSeederComponent', () => {
  let component: DomainSeederComponent;
  let fixture: ComponentFixture<DomainSeederComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DomainSeederComponent],
      providers: getTestProviders(),
    })
    // Override the component's imports to exclude directives that are pulled
    // through the directives barrel (which has a circular chain in test context).
    .overrideComponent(DomainSeederComponent, {
      set: {
        imports: [
          ReactiveFormsModule, FormsModule, NgClass, AsyncPipe,
          MatSliderModule, MatChipsModule, MatFormFieldModule,
          MatInputModule, MatIconModule, MatProgressBarModule,
          CheckboxComponent, SeederResultsComponent,
        ],
      },
    })
    .compileComponents();

    fixture = TestBed.createComponent(DomainSeederComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialise researchForm with default config values', () => {
    const cfg = component['researchForm'].get('config');
    expect(cfg).toBeTruthy();
    expect(cfg!.get('source')!.value).toBe('sitemap+cc');
    expect(cfg!.get('concurrency')!.value).toBe(1000);
  });

  it('should start with an empty domains FormArray', () => {
    expect(component.domains.length).toBe(0);
  });
});
