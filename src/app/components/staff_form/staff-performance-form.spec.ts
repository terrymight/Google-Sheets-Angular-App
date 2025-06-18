import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffPerformanceForm } from './staff-performance-form';

describe('StaffPerformanceForm', () => {
  let component: StaffPerformanceForm;
  let fixture: ComponentFixture<StaffPerformanceForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffPerformanceForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StaffPerformanceForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
