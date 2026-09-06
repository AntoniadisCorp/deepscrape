import { TestBed } from '@angular/core/testing';
import { SeederResultsComponent } from './seeder-results.component';
import { getTestProviders } from 'src/app/testing';

describe('SeederResultsComponent', () => {
  let component: SeederResultsComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    TestBed.runInInjectionContext(() => {
      component = new SeederResultsComponent();
    });
  });

  it('toggleExpand sets a url to true on first call', () => {
    component.toggleExpand('https://example.com');
    expect(component.expanded['https://example.com']).toBeTrue();
  });

  it('toggleExpand flips an already-expanded url to false', () => {
    component.toggleExpand('https://example.com');
    component.toggleExpand('https://example.com');
    expect(component.expanded['https://example.com']).toBeFalse();
  });

  it('trackByUrl returns the url when present', () => {
    const result = { url: 'https://example.com' } as any;
    expect(component.trackByUrl(0, result)).toBe('https://example.com');
  });

  it('trackByUrl falls back to index when url is absent', () => {
    expect(component.trackByUrl(3, {} as any)).toBe(3);
  });

  it('getRelevanceColorClass returns green class for score >= 0.8', () => {
    expect(component.getRelevanceColorClass(0.9)).toContain('green');
  });

  it('getRelevanceColorClass returns orange class for score < 0.4', () => {
    expect(component.getRelevanceColorClass(0.2)).toContain('orange');
  });

  it('getDefinedMeta filters out null, undefined and empty string values', () => {
    const meta = { title: 'Hello', empty: '', nullVal: null, valid: 'world' };
    const result = component.getDefinedMeta(meta);
    expect(result['title']).toBe('Hello');
    expect(result['valid']).toBe('world');
    expect(result['empty']).toBeUndefined();
    expect(result['nullVal']).toBeUndefined();
  });
});
