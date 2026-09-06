import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { GinputComponent } from './ginput.component';
import { getTestProviders } from 'src/app/testing';

@Component({
  standalone: true,
  imports: [GinputComponent],
  template: '<app-ginput [control]="control" label="URL"></app-ginput>',
})
class HostComponent {
  control = new FormControl<string>('https://example.com', { nonNullable: true });
}

describe('GinputComponent', () => {
  let component: GinputComponent;
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    component = fixture.debugElement.query(By.directive(GinputComponent)).componentInstance;
  });

  it('should update placeholder on focus and blur', () => {
    component.doFocus();
    expect(component.URLPlaceholder).toBe('Set a URL string..');

    component.doBlur();
    expect(component.URLPlaceholder).toBe(' ');
  });

  it('should initialize placeholder as blank space on init', () => {
    expect(component.URLPlaceholder).toBe(' ');
  });
});
