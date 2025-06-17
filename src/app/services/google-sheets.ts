import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { BehaviorSubject, catchError, from, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { SheetsApiResponse } from "./../models/sheets-api";
declare const google: any;
declare const gapi: any;

@Injectable({
  providedIn: 'root'
})
export class GoogleSheets {

  private readonly scopes = 'https://www.googleapis.com/auth/spreadsheets';
  private readonly discoveryDocs = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];
  private tokenClient: any;
  private isSignedIn = new BehaviorSubject<boolean>(false);
  isSignedIn$ = this.isSignedIn.asObservable();

  constructor() {}

  initialize(): Observable<void> {
    return new Observable<void>(observer => {
      if (!gapi || !google) {
        observer.error('Google API scripts not loaded');
        return;
      }
      gapi.load('client', () => {
        gapi.client
          .init({
            discoveryDocs: this.discoveryDocs
          })
          .then(() => {
            this.tokenClient = google.accounts.oauth2.initTokenClient({
              client_id: environment.googleClientId,
              scope: this.scopes,
              callback: (response: any) => {
                if (response.error) {
                  observer.error(response.error);
                } else {
                  console.log('Access token:', response.access_token);
                  gapi.client.setToken({ access_token: response.access_token });
                  this.isSignedIn.next(true);
                  observer.next();
                  observer.complete();
                }
              }
            });
          })
          .catch((error: any) => observer.error(error));
      });
    }).pipe(
      catchError(err => {
        console.error('Initialization error:', err);
        return throwError(() => new Error('Failed to initialize Google API client'));
      })
    );
  }

  signIn(): Observable<void> {
    return new Observable<void>(observer => {
      if (!this.tokenClient) {
        observer.error('Token client not initialized');
        return;
      }
      this.tokenClient.requestAccessToken({ prompt: 'select_account' });
      const subscription = this.isSignedIn$.subscribe(isSignedIn => {
        if (isSignedIn) {
          observer.next();
          observer.complete();
          subscription.unsubscribe();
        }
      });
    }).pipe(
      catchError(err => {
        console.error('Sign-in error:', err);
        return throwError(() => new Error('Failed to sign in'));
      })
    );
  }

  signOut(): Observable<void> {
    return from(
      new Promise<void>((resolve) => {
        google.accounts.oauth2.revoke(gapi.client.getToken().access_token, () => {
          this.isSignedIn.next(false);
          gapi.client.setToken(null);
          resolve();
        });
      })
    ).pipe(
      catchError(err => {
        console.error('Sign-out error:', err);
        return throwError(() => new Error('Failed to sign out'));
      })
    );
  }

  readSheet(range: string): Observable<any[][]> {
    return this.isSignedIn$.pipe(
      switchMap(isSignedIn => {
        if (!isSignedIn) {
          return this.signIn().pipe(switchMap(() => this.performRead(range)));
        }
        return this.performRead(range);
      }),
      catchError(err => {
        console.error('Read sheet error:', err);
        return of([]);
      })
    );
  }

  private performRead(range: string): Observable<any[][]> {
    return from(
      gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: environment.spreadsheetId,
        range
      }) as Promise<SheetsApiResponse>
    ).pipe(
      tap(response => console.log('Read response:', response)),
      switchMap((response: SheetsApiResponse) => from(Promise.resolve(response.result.values || []))),
      catchError(err => {
        console.error('Perform read error:', err);
        return of([]);
      })
    );
  }

  appendSheet(range: string, values: any[][]): Observable<any> {
    return this.isSignedIn$.pipe(
      switchMap(isSignedIn => {
        if (!isSignedIn) {
          console.log('User not signed in, prompting sign-in...');
          return this.signIn().pipe(switchMap(() => this.performAppend(range, values)));
        }
        console.log('Appending to:', { spreadsheetId: environment.spreadsheetId, range, values });
        return this.performAppend(range, values);
      }),
      catchError(err => {
        console.error('Append sheet error:', err);
        return throwError(() => new Error('Failed to append to sheet'));
      })
    );
  }

  private performAppend(range: string, values: any[][]): Observable<any> {
    return from(
      gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: environment.spreadsheetId,
        range,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: { values }
      }) as Promise<SheetsApiResponse>
    ).pipe(
      tap(response => console.log('Append response:', response)),
      switchMap((response: SheetsApiResponse) => from(Promise.resolve(response.result))),
      catchError(err => {
        console.error('Perform append error:', err);
        return throwError(() => new Error('Failed to append to sheet'));
      })
    );
  }

  // Keep writeSheet for reference, but prefer appendSheet for adding new rows
  writeSheet(range: string, values: any[][]): Observable<any> {
    return this.isSignedIn$.pipe(
      switchMap(isSignedIn => {
        if (!isSignedIn) {
          console.log('User not signed in, prompting sign-in...');
          return this.signIn().pipe(switchMap(() => this.performWrite(range, values)));
        }
        console.log('Writing to:', { spreadsheetId: environment.spreadsheetId, range, values });
        return this.performWrite(range, values);
      }),
      catchError(err => {
        console.error('Write sheet error:', err);
        return throwError(() => new Error('Failed to write sheet'));
      })
    );
  }

  private performWrite(range: string, values: any[][]): Observable<any> {
    return from(
      gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: environment.spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: { values }
      }) as Promise<SheetsApiResponse>
    ).pipe(
      tap(response => console.log('Write response:', response)),
      switchMap((response: SheetsApiResponse) => from(Promise.resolve(response.result))),
      catchError(err => {
        console.error('Perform write error:', err);
        return throwError(() => new Error('Failed to write sheet'));
      })
    );
  }
}
