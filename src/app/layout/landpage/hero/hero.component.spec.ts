import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeroComponent } from './hero.component';
import { getTestProviders } from 'src/app/testing';

describe('HeroComponent', () => {
  let component: HeroComponent;
  let fixture: ComponentFixture<HeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('scrollTo should call scroll service when target element exists', () => {
    const element = document.createElement('div');
    const getElementSpy = spyOn(document, 'getElementById').and.returnValue(element);
    const scrollSpy = spyOn((component as any).scroll, 'scrollToElementByOffset');

    component.scrollTo('features');

    expect(getElementSpy).toHaveBeenCalledWith('features');
    expect(scrollSpy).toHaveBeenCalledWith(element);
  });

  it('scrollTo should do nothing when target element is missing', () => {
    spyOn(document, 'getElementById').and.returnValue(null);
    const scrollSpy = spyOn((component as any).scroll, 'scrollToElementByOffset');

    component.scrollTo('missing-anchor');

    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('scrollIntoView should call scrollTo with hash fragment id', () => {
    spyOnProperty((component as any).router, 'url', 'get').and.returnValue('/#pricing');
    const scrollToSpy = spyOn(component, 'scrollTo');

    component.scrollIntoView();

    expect(scrollToSpy).toHaveBeenCalledWith('pricing');
  });
});
