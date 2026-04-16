import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeaturesComponent } from './features.component';
import { getTestProviders } from 'src/app/testing';

describe('FeaturesComponent', () => {
  let component: FeaturesComponent;
  let fixture: ComponentFixture<FeaturesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeaturesComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeaturesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose six core and six advanced features', () => {
    expect(component.coreFeatures.length).toBe(6);
    expect(component.advancedFeatures.length).toBe(6);
  });

  it('feature entries should contain title and description content', () => {
    const sample = component.coreFeatures[0];

    expect(sample.title).toBeTruthy();
    expect(sample.description).toBeTruthy();
  });

  it('icons map should include known icon keys used by features', () => {
    expect(component.icons['bot']).toBeTruthy();
    expect(component.icons['network']).toBeTruthy();
    expect(component.icons['brain']).toBeTruthy();
  });
});
