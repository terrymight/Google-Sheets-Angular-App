import { Routes } from '@angular/router';

export const routes: Routes = [
    // { path: '', loadComponent: ()=> import('./components/sigin/sigin').then( m => m.Sigin) },
    { path: '', loadComponent: ()=> import('./components/staff_form/staff-performance-form').then(m=>m.StaffPerformanceForm) },
    { path: '**', redirectTo: '' }
];
