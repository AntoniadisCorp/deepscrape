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
    }).compileComponents();
    fixture = TestBed.createComponent(PromptareaComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('userPrompt', new FormControl<string>('', { nonNullable: true }));
    fixture.componentRef.setInput('submitControl', new FormControl<boolean>(false, { nonNullable: true }));
    fixture.detectChanges();
  });

  it('doValidation adds error when prompt is empty', () => {
    component.doValidation();
    expect(component.errors).toContain('Please enter a prompt.');
  });

  it('doValidation adds error when prompt exceeds 4000 characters', () => {
    component.userPrompt.setValue('a'.repeat(4000));
    component.doValidation();
    expect(component.errors).toContain('Prompt exceeds the character limit.');
  });

  it('doValidation adds error when prompt is shorter than 5 characters', () => {
    component.userPrompt.setValue('hi');
    component.doValidation();
    expect(component.errors).toContain('Prompt must be at least 5 characters long.');
  });

  it('submitPrompt emits the value and sets status to success for valid input', () => {
    const spy = jasmine.createSpy('submited');
    component.submited.subscribe(spy);
    component.userPrompt.setValue('Hello world');
    component.submitPrompt();
    expect(spy).toHaveBeenCalledWith('Hello world');
    expect(component.submissionStatus).toBe('success');
  });

  it('clearPrompt resets the form value and emits clear', () => {
    const spy = jasmine.createSpy('clear');
    component.clear.subscribe(spy);
    component.userPrompt.setValue('some text');
    (component as any).clearPrompt();
    expect(component.userPrompt.value).toBe('');
    expect(spy).toHaveBeenCalled();
  });
});
