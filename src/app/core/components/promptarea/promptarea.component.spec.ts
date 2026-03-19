import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { PromptareaComponent } from './promptarea.component';
import { getTestProviders } from 'src/app/testing';

describe('PromptareaComponent', () => {
  let component: PromptareaComponent;
  let fixture: ComponentFixture<PromptareaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PromptareaComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(PromptareaComponent);
    component = fixture.componentInstance;
    component.userPrompt = new FormControl<string>('', { nonNullable: true });
    component.submitControl = new FormControl<boolean>(false, { nonNullable: true });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
