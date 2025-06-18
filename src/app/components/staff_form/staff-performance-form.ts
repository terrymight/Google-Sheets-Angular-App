import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Department, DepartmentName } from '../../models/departments';
import { CommonModule } from '@angular/common';
import { catchError, debounceTime, distinctUntilChanged, finalize, tap } from 'rxjs/operators'; // For optional performance enhancement
import { EMPTY, Subscription } from 'rxjs';
import { GoogleSheets } from '../../services/google-sheets';

@Component({
  selector: 'app-staff-performance-form',
  templateUrl: './staff-performance-form.html',
  styleUrl: './staff-performance-form.css',
  imports: [ReactiveFormsModule, CommonModule],
})
export class StaffPerformanceForm  implements OnInit, OnDestroy {
  staffForm!: FormGroup;
  currentStep: number = 1;
  totalSteps: number = 3;

  departments: string[] = [
    'Administration', 'Human Resources', 'Finance', 'Operations',
    'Marketing', 'IT', 'Pastoral Care', 'Worship',
    'Children Ministry', 'Youth Ministry'
  ];

  performancePeriods: string[] = [
    'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024',
    'Annual 2024',
    'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025',
    'Annual 2025'
  ];

  groupPastorMap: { [key: string]: string[] } = {
    'Nyanaya': [
      'Pastor John Doe',
      'Pastor Jane Smith',
      'Coordinator Peter Jones'
    ],
    'Mararaba': [
      'Pastor David Lee',
      'Pastor Sarah Chen',
      'Pastor Mark Taylor'
    ],
    'Other Group': [
      'Pastor Emily White',
      'Coordinator Chris Green'
    ]
  };

  groupPastors: string[] = [];
  churchPastorsCoordinators: string[] = [];
  isLoading: boolean = false;
  submissionMessage: string = '';
  private submissionMessageTimeout: any;
  private submitSubscription: Subscription | undefined; // To manage the submission observable

  private authSubscription: Subscription | undefined;
  private formSubscription: Subscription | undefined;

  constructor(
    private fb: FormBuilder,
    private googleSheetsService: GoogleSheets
  ) { }

  ngOnInit(): void {
    this.groupPastors = Object.keys(this.groupPastorMap);

    this.staffForm = this.fb.group({
      fullName: ['', Validators.required],
      jobTitle: ['', Validators.required],
      departmentUnit: ['', Validators.required],
      nameOfSupervisor: ['', Validators.required],
      performancePeriod: ['', Validators.required],
      groupPastor: ['', Validators.required],
      churchPastorCoordinator: ['', Validators.required],
      keyResultAreas: this.fb.array([this.createKeyResultAreaFormGroup()]),
      ideasAndInnovations: this.fb.array([this.createIdeaInnovationFormGroup()])
    });

    this.formSubscription = this.staffForm.get('groupPastor')?.valueChanges
      .pipe(
        debounceTime(100),
        distinctUntilChanged()
      )
      .subscribe(selectedGroupPastor => {
        this.updateChurchPastorCoordinators(selectedGroupPastor);
      });

    this.authSubscription = this.googleSheetsService.initialize().subscribe({
      next: () => {
        console.log('GoogleSheetsService initialized.');
      },
      error: (err) => console.error('Failed to initialize GoogleSheetsService:', err)
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
    // Unsubscribe from the submit subscription if it's still active
    if (this.submitSubscription) {
      this.submitSubscription.unsubscribe();
    }
    // Clear any active message timeout
    if (this.submissionMessageTimeout) {
      clearTimeout(this.submissionMessageTimeout);
    }
  }

  private setSubmissionMessage(message: string, duration: number = 3000): void {
    if (this.submissionMessageTimeout) {
      clearTimeout(this.submissionMessageTimeout);
    }
    this.submissionMessage = message;
    if (duration > 0) {
      this.submissionMessageTimeout = setTimeout(() => {
        this.submissionMessage = '';
        this.submissionMessageTimeout = null;
      }, duration);
    } else {
      this.submissionMessageTimeout = null;
    }
  }

  get keyResultAreas(): FormArray {
    return this.staffForm.get('keyResultAreas') as FormArray;
  }

  get ideasAndInnovations(): FormArray {
    return this.staffForm.get('ideasAndInnovations') as FormArray;
  }

  createKeyResultAreaFormGroup(): FormGroup {
    return this.fb.group({
      keyResultArea: ['', Validators.required],
      specificAchievements: ['', Validators.required],
      specialComment: ['']
    });
  }

  createIdeaInnovationFormGroup(): FormGroup {
    return this.fb.group({
      idea: ['', Validators.required],
      impactMade: ['', Validators.required]
    });
  }

  addKeyResultArea(): void {
    this.keyResultAreas.push(this.createKeyResultAreaFormGroup());
  }

  removeKeyResultArea(index: number): void {
    if (this.keyResultAreas.length > 1) {
      this.keyResultAreas.removeAt(index);
    }
  }

  addIdeaInnovation(): void {
    this.ideasAndInnovations.push(this.createIdeaInnovationFormGroup());
  }

  removeIdeaInnovation(index: number): void {
    if (this.ideasAndInnovations.length > 1) {
      this.ideasAndInnovations.removeAt(index);
    }
  }

  nextStep(): void {
    if (this.isCurrentStepValid()) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.setSubmissionMessage('');
      }
    } else {
      this.markCurrentStepControlsAsTouched();
      this.setSubmissionMessage('Please complete all required fields in the current step before proceeding.', 3000);
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.setSubmissionMessage('');
    }
  }

  isCurrentStepValid(): boolean | undefined{
    switch (this.currentStep) {
      case 1:
        return this.staffForm.get('fullName')?.valid &&
               this.staffForm.get('jobTitle')?.valid &&
               this.staffForm.get('departmentUnit')?.valid &&
               this.staffForm.get('nameOfSupervisor')?.valid &&
               this.staffForm.get('performancePeriod')?.valid &&
               this.staffForm.get('groupPastor')?.valid &&
               this.staffForm.get('churchPastorCoordinator')?.valid;
      case 2:
        return this.keyResultAreas.valid;
      case 3:
        return this.ideasAndInnovations.valid;
      default:
        return false;
    }
  }

  markCurrentStepControlsAsTouched(): void {
    switch (this.currentStep) {
      case 1:
        this.markControlsAsTouched([
          'fullName', 'jobTitle', 'departmentUnit', 'nameOfSupervisor',
          'performancePeriod', 'groupPastor', 'churchPastorCoordinator'
        ]);
        break;
      case 2:
        this.markAllControlsInFormArrayAsTouched(this.keyResultAreas);
        break;
      case 3:
        this.markAllControlsInFormArrayAsTouched(this.ideasAndInnovations);
        break;
    }
  }

  markControlsAsTouched(controlNames: string[]): void {
    controlNames.forEach(name => {
      this.staffForm.get(name)?.markAsTouched();
    });
  }

  markAllControlsInFormArrayAsTouched(formArray: FormArray): void {
    formArray.controls.forEach((control: AbstractControl) => {
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markAllAsTouched(control);
      } else {
        control.markAsTouched();
      }
    });
  }

  markAllAsTouched(control: FormGroup | FormArray): void {
    Object.values(control.controls).forEach(c => {
      c.markAsTouched();
      if ((c as any).controls) {
        this.markAllAsTouched(c as FormGroup | FormArray);
      }
    });
  }

  updateChurchPastorCoordinators(groupPastor: string): void {
    this.churchPastorsCoordinators = this.groupPastorMap[groupPastor] || [];
    const currentChurchPastor = this.staffForm.get('churchPastorCoordinator')?.value;
    if (!this.churchPastorsCoordinators.includes(currentChurchPastor)) {
      this.staffForm.get('churchPastorCoordinator')?.setValue('');
    }
  }

  // --- UPDATED onSubmit() METHOD WITH DIAGNOSTIC LOGS ---
  onSubmit(): void {
    if (this.currentStep === this.totalSteps && this.staffForm.valid) {
      this.isLoading = true;
      this.setSubmissionMessage('Submitting form...', 0);
      console.log('1. onSubmit: Starting submission process.');

      const dataRow: any[] = [];
      dataRow.push(
        this.staffForm.get('fullName')?.value,
        this.staffForm.get('jobTitle')?.value,
        this.staffForm.get('departmentUnit')?.value,
        this.staffForm.get('nameOfSupervisor')?.value,
        this.staffForm.get('performancePeriod')?.value,
        this.staffForm.get('groupPastor')?.value,
        this.staffForm.get('churchPastorCoordinator')?.value
      );
      this.keyResultAreas.controls.forEach((kraGroup) => {
        const kraFormGroup = kraGroup as FormGroup;
        dataRow.push(
          kraFormGroup.get('keyResultArea')?.value,
          kraFormGroup.get('specificAchievements')?.value,
          kraFormGroup.get('specialComment')?.value
        );
      });
      this.ideasAndInnovations.controls.forEach((ideaGroup) => {
        const ideaFormGroup = ideaGroup as FormGroup;
        dataRow.push(
          ideaFormGroup.get('idea')?.value,
          ideaFormGroup.get('impactMade')?.value
        );
      });
      dataRow.push(new Date().toLocaleString());
      const valuesToAppend = [dataRow];

      if (this.submitSubscription) {
        this.submitSubscription.unsubscribe();
        console.log('2. onSubmit: Unsubscribed from previous submission.');
      }

      console.log('3. onSubmit: Subscribing to appendSheet observable.');
      this.submitSubscription = this.googleSheetsService.appendSheet('Sheet1', valuesToAppend).pipe(
        tap(response => {
          console.log('4. Tap: Append successful, processing response.');
          this.setSubmissionMessage('Form submitted successfully!', 5000);
          this.staffForm.reset();
          this.currentStep = 1;
          this.keyResultAreas.clear();
          this.keyResultAreas.push(this.createKeyResultAreaFormGroup());
          this.ideasAndInnovations.clear();
          this.ideasAndInnovations.push(this.createIdeaInnovationFormGroup());
          this.staffForm.get('departmentUnit')?.setValue('');
          this.staffForm.get('performancePeriod')?.setValue('');
          this.staffForm.get('groupPastor')?.setValue('');
          this.churchPastorsCoordinators = [];
          this.staffForm.get('churchPastorCoordinator')?.setValue('');
          console.log('5. Tap: Form reset and state updated.');
        }),
        catchError(error => {
          console.error('6. CatchError: Error submitting form to Google Sheets:', error);
          this.setSubmissionMessage('Error submitting form. Please try again.', 5000);
          return EMPTY; // Important: Return EMPTY to complete the stream after error
        }),
        finalize(() => {
          console.log('7. Finalize: Observable sequence completed or errored.');
          this.isLoading = false;
          this.submitSubscription = undefined;
        })
      ).subscribe({
        next: (data) => {
          this.isLoading = false;
          this.submitSubscription = undefined;
        },
        error: (err) => console.error('9. Subscribe Error: Uncaught error in subscription:', err), // Should only be hit if catchError re-throws
        complete: () => console.log('10. Subscribe Complete: Observable stream finished.') // Should always be hit if the stream terminates
      });
    } else {
      this.markCurrentStepControlsAsTouched();
      this.setSubmissionMessage('Please complete all required fields before submitting.', 3000);
      if (!this.staffForm.get('fullName')?.valid && this.currentStep !== 1) this.currentStep = 1;
      else if (!this.keyResultAreas.valid && this.currentStep !== 2) this.currentStep = 2;
      else if (!this.ideasAndInnovations.valid && this.currentStep !== 3) this.currentStep = 3;
      console.log('Form invalid or not at last step.');
    }
  }
}