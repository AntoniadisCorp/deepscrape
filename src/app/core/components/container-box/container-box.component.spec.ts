import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContainerBoxComponent } from './container-box.component';
import { getTestProviders } from 'src/app/testing';
import { MACHNINE_STATE } from '../../enum';

describe('ContainerBoxComponent', () => {
  let component: ContainerBoxComponent;
  let fixture: ComponentFixture<ContainerBoxComponent>;

  const mockMachine = {
    id: 'machine-1',
    instance_id: 'instance-1',
    name: 'Test Machine',
    description: 'Machine for tests',
    state: MACHNINE_STATE.CREATED,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    default: false,
    deploymentId: 'dep-1',
    host_status: 'ok',
    config: {
      guest: {
        cpus: 1,
        memory_mb: 512,
        cpu_kind: 'shared',
      },
    },
    events: [],
    image_ref: {},
    private_ip: '127.0.0.1',
    region: 'local',
    menu_visible: false,
  } as any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContainerBoxComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContainerBoxComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('machine', mockMachine);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle menu visibility', () => {
    expect(component.machine.menu_visible).toBeFalse();
    component.toggleMenuVisible();
    expect(component.machine.menu_visible).toBeTrue();
  });

  it('should set machine state to stopping when stop is called', () => {
    component['stop']();
    expect(component.machine.state).toBe(MACHNINE_STATE.STOPPING);
  });
});
