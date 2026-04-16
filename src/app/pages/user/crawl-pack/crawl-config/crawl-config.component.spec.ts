import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrawlConfigComponent } from './crawl-config.component';
import { getTestProviders } from 'src/app/testing';

describe('CrawlConfigComponent', () => {
  let component: CrawlConfigComponent;
  let fixture: ComponentFixture<CrawlConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrawlConfigComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrawlConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default cache mode', () => {
    const cacheMode = component.configForm.get('cacheMode')?.value;

    expect(cacheMode.code).toBe('none');
  });

  it('addCrawlConfig should open settings and clear selected config', () => {
    (component as any).configSelectedById = 'crawl-1';
    component.configForm.get('title')?.setValue('My Crawl Config');

    (component as any).addCrawlConfig();

    expect((component as any).newConfigOpened).toBeTrue();
    expect((component as any).showSettings).toBeTrue();
    expect((component as any).configSelectedById).toBe('');
    expect(component.configForm.get('title')?.value).toBe('');
  });

  it('getAndFilterConfirmForm should remove title and created_at fields', () => {
    component.configForm.get('title')?.setValue('Config A');
    component.configForm.get('wordCountThreshold')?.setValue(333);
    component.configForm.get('wordCountThreshold')?.markAsDirty();

    const result = component.getAndFilterConfirmForm() as any;

    expect(result.title).toBeUndefined();
    expect(result.created_at).toBeUndefined();
    expect(result.wordCountThreshold).toBe(333);
  });
});
