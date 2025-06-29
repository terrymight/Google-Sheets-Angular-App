import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, takeUntil, catchError, of, tap } from 'rxjs';
import { GoogleSheets } from '../../services/google-sheets';

@Component({
  selector: 'app-sigin',
  imports: [ CommonModule, FormsModule],
  templateUrl: './sigin.html',
  styleUrl: './sigin.css'
})
export class Sigin implements OnInit, OnDestroy {
  data$!: Observable<any[][]>;
  newRow: string[] = ['', ''];
  error: string | null = null;
  isSignedIn$: Observable<boolean>;
  private destroy$ = new Subject<void>();

  constructor(private googleSheetsService: GoogleSheets) {
    this.isSignedIn$ = this.googleSheetsService.isSignedIn$;
  }

  ngOnInit(): void {
    this.googleSheetsService
      .initialize()
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.error = err.message;
          return of(null);
        })
      )
      .subscribe(() => this.loadData());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  signIn(): void {
    this.googleSheetsService
      .signIn()
      .pipe(
        takeUntil(this.destroy$),
        tap(() => this.loadData()),
        catchError(err => {
          this.error = err.message;
          return of(null);
        })
      )
      .subscribe();
  }

  signOut(): void {
    this.googleSheetsService
      .signOut()
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.error = err.message;
          return of(null);
        })
      )
      .subscribe(() => {
        this.data$ = of([]);
      });
  }

  addRow(): void {
    this.googleSheetsService
      .appendSheet('Sheet1!A:B', [this.newRow]) // Use appendSheet
      .pipe(
        takeUntil(this.destroy$),
        tap(() => {
          this.newRow = ['', ''];
          this.loadData();
        }),
        catchError(err => {
          this.error = err.message;
          return of(null);
        })
      )
      .subscribe();
  }

  private loadData(): void {
    this.data$ = this.googleSheetsService.readSheet('Sheet1!A1:B').pipe(
      tap(data => console.log('Loaded data:', data)),
      catchError(err => {
        this.error = err.message;
        return of([]);
      })
    );
  }

  // eof
}
