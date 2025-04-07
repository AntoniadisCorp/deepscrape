import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { RippleDirective } from '../../directives';

@Component({
    selector: 'app-promptarea',
    imports: [ReactiveFormsModule, NgIf, NgFor, NgClass, MatIcon, MatProgressSpinner, RippleDirective],
    templateUrl: './promptarea.component.html',
    styleUrl: './promptarea.component.scss'
})
export class PromptareaComponent {

  @Input() enableClearBtn?: boolean = false
  @Input() userPrompt: FormControl<string>

  @Input() submitControl: FormControl<boolean>
  @Output() submited: EventEmitter<string> = new EventEmitter<string>()

  @Output() clear: EventEmitter<void> = new EventEmitter<void>()

  @Output() abort: EventEmitter<void> = new EventEmitter<void>()

  isProcessing: boolean = false
  maxCharacters: number = 4000;
  errors: string[] = [];
  submissionStatus: string = '';

  constructor() {

    this.userPrompt = new FormControl('', { nonNullable: true })
    this.submitControl = new FormControl(false, { nonNullable: true })
  }

  ngOnInit(): void {

    /*  this.userPrompt.valueChanges.subscribe({
       next: (value) => {
         this.characterCount = value.length;
       }
     }) */

    /* this.submitControl.valueChanges.subscribe(result => {

      if () {
        console.log('ewrwerwerwerewrrew')
        this.submitControl.disable()
      } else {
        this.submitControl.enable()
      }
    }) */
  }

  submitPrompt(): void {
    this.errors = [];
    this.submissionStatus = '';

    if (this.userPrompt.value.length === 0) {
      this.errors.push('Please enter a prompt.');
      return;
    }

    if (this.userPrompt.value.length >= this.maxCharacters) {
      this.errors.push('Prompt exceeds the character limit.');
      return;
    }

    try {
      // Logic to submit the prompt to the AI model goes here
      // For demonstration purposes, we'll simulate a successful submission
      setTimeout(() => {
        this.submited.emit(this.userPrompt.value)
        this.submissionStatus = 'success'
      }, 30);
    } catch (error: any) {
      this.submissionStatus = 'error';
      this.errors.push('An error occurred during submission: ' + error.message);
    }
  }

  protected clearPrompt(): void {
    this.userPrompt.setValue('')
    this.clear.emit()
  }
  protected abortRequests(): void {
    this.abort.emit()
  }
}
