import { TestBed } from '@angular/core/testing';
import { OperationsTabComponent } from './operations-tab.component';
import { getTestProviders } from 'src/app/testing';

describe('OperationsTabComponent', () => {
  let component: OperationsTabComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    TestBed.runInInjectionContext(() => {
      component = new OperationsTabComponent();
    });
  });

  it('starts collapsed', () => {
    expect(component.isExpanded).toBeFalse();
  });

  it('toggleExpand flips to expanded', () => {
    component.toggleExpand();
    expect(component.isExpanded).toBeTrue();
  });

  it('toggleExpand flips back to collapsed on second call', () => {
    component.toggleExpand();
    component.toggleExpand();
    expect(component.isExpanded).toBeFalse();
  });
});
