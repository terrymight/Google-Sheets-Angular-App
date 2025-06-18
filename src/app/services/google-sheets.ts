import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { BehaviorSubject, catchError, from, map, Observable, of, switchMap, tap, throwError } from 'rxjs';


// Extend Window interface to include gapi and google (for global scripts)
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// Define the shape of the Sheets API response for better type checking
interface SheetsApiResponse {
  result: {
    values?: any[][];
    [key: string]: any;
  };
  [key: string]: any;
}


@Injectable({
  providedIn: 'root'
})
export class GoogleSheets {

  private readonly scopes = 'https://www.googleapis.com/auth/spreadsheets';
  private readonly discoveryDocs = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];
  private tokenClient: any;
  private isSignedIn: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isSignedIn$ = this.isSignedIn.asObservable();

  constructor() {
    if (typeof window.gapi === 'undefined' || typeof window.google === 'undefined') {
      console.warn('Google API scripts (gapi or google) not yet loaded. Ensure index.html includes them.');
    }
  }

  initialize(): Observable<void> {
    return new Observable<void>(observer => {
      if (window.gapi && window.gapi.client && window.gapi.client.sheets) {
        console.log('Google API client already initialized.');
        this.isSignedIn.next(!!window.gapi.client.getToken());
        observer.next();
        observer.complete();
        return;
      }

      window.gapi.load('client', () => {
        window.gapi.client
          .init({
            discoveryDocs: this.discoveryDocs
          })
          .then(() => {
            console.log('Google API client initialized.');
            this.tokenClient = window.google.accounts.oauth2.initTokenClient({
              client_id: environment.googleClientId,
              scope: this.scopes,
              callback: (response: any) => {
                if (response.error) {
                  console.error('Token client callback error:', response.error);
                  this.isSignedIn.next(false);
                  observer.error(new Error(response.error));
                } else {
                  console.log('Access token acquired:', response.access_token ? 'Yes' : 'No');
                  window.gapi.client.setToken({ access_token: response.access_token });
                  this.isSignedIn.next(true);
                  observer.next();
                  observer.complete();
                }
              }
            });
            if (window.gapi.client.getToken()) {
                this.isSignedIn.next(true);
                observer.next();
                observer.complete();
            }
          })
          .catch((error: any) => {
            console.error('GAPI client init error:', error);
            observer.error(error);
          });
      });
    }).pipe(
      catchError(err => {
        console.error('Initialization error in service:', err);
        return throwError(() => new Error('Failed to initialize Google API client'));
      })
    );
  }

  signIn(): Observable<void> {
    return new Observable<void>(observer => {
      if (!this.tokenClient) {
        console.error('Token client not initialized. Call initialize() first.');
        observer.error('Token client not initialized');
        return;
      }
      console.log('Requesting access token...');
      this.tokenClient.requestAccessToken({ prompt: 'select_account' });

      const subscription = this.isSignedIn$.subscribe(isSignedIn => {
        if (isSignedIn) {
          console.log('Sign-in successful.');
          observer.next();
          observer.complete();
          subscription.unsubscribe();
        }
      });
    }).pipe(
      catchError(err => {
        console.error('Sign-in error in service:', err);
        return throwError(() => new Error('Failed to sign in'));
      })
    );
  }

  signOut(): Observable<void> {
    return from(
      new Promise<void>((resolve) => {
        const token = window.gapi.client.getToken();
        if (token) {
          window.google.accounts.oauth2.revoke(token.access_token, () => {
            this.isSignedIn.next(false);
            window.gapi.client.setToken(null);
            console.log('Signed out.');
            resolve();
          });
        } else {
          console.log('No token to revoke, already signed out or not signed in.');
          this.isSignedIn.next(false);
          resolve();
        }
      })
    ).pipe(
      catchError(err => {
        console.error('Sign-out error in service:', err);
        return throwError(() => new Error('Failed to sign out'));
      })
    );
  }

  appendSheet(range: string, values: any[][]): Observable<any> {
    return this.isSignedIn$.pipe(
      switchMap(isSignedIn => {
        if (!isSignedIn) {
          console.log('User not signed in, prompting sign-in for append operation...');
          return this.signIn().pipe(switchMap(() => this.performAppend(range, values)));
        }
        console.log('Appending data to sheet:', { spreadsheetId: environment.spreadsheetId, range, values });
        return this.performAppend(range, values);
      }),
      catchError(err => {
        console.error('Append sheet error in service:', err);
        return throwError(() => new Error('Failed to append to sheet'));
      })
    );
  }

  private performAppend(range: string, values: any[][]): Observable<any> {
    if (!window.gapi || !window.gapi.client || !window.gapi.client.sheets) {
      console.error('Google Sheets API client not fully loaded or initialized.');
      return throwError(() => new Error('Google Sheets API not ready.'));
    }

    return from(
      window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: environment.spreadsheetId,
        range,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: { values }
      }) as Promise<SheetsApiResponse>
    ).pipe(
      tap(response => console.log('Append response from API:', response)),
      switchMap((response: SheetsApiResponse) => from(Promise.resolve(response.result))),
      catchError(err => {
        console.error('Perform append API error:', err);
        return throwError(() => new Error('Error performing append operation.'));
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
        console.error('Read sheet error in service:', err);
        return of([]);
      })
    );
  }

  private performRead(range: string): Observable<any[][]> {
    if (!window.gapi || !window.gapi.client || !window.gapi.client.sheets) {
      console.error('Google Sheets API client not fully loaded or initialized.');
      return throwError(() => new Error('Google Sheets API not ready.'));
    }
    return from(
      window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: environment.spreadsheetId,
        range
      }) as Promise<SheetsApiResponse>
    ).pipe(
      tap(response => console.log('Read response from API:', response)),
      switchMap((response: SheetsApiResponse) => from(Promise.resolve(response.result.values || []))),
      catchError(err => {
        console.error('Perform read API error:', err);
        return throwError(() => new Error('Error performing read operation.'));
      })
    );
  }

  writeSheet(range: string, values: any[][]): Observable<any> {
    return this.isSignedIn$.pipe(
      switchMap(isSignedIn => {
        if (!isSignedIn) {
          console.log('User not signed in, prompting sign-in for write operation...');
          return this.signIn().pipe(switchMap(() => this.performWrite(range, values)));
        }
        console.log('Writing to sheet:', { spreadsheetId: environment.spreadsheetId, range, values });
        return this.performWrite(range, values);
      }),
      catchError(err => {
        console.error('Write sheet error in service:', err);
        return throwError(() => new Error('Failed to write sheet'));
      })
    );
  }

  private performWrite(range: string, values: any[][]): Observable<any> {
    if (!window.gapi || !window.gapi.client || !window.gapi.client.sheets) {
      console.error('Google Sheets API client not fully loaded or initialized.');
      return throwError(() => new Error('Google Sheets API not ready.'));
    }
    return from(
      window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: environment.spreadsheetId,
        range,
        valueInputOption: 'RAW', // Important for direct writes
        resource: { values }
      }) as Promise<SheetsApiResponse>
    ).pipe(
      tap(response => console.log('Write response from API:', response)),
      switchMap((response: SheetsApiResponse) => from(Promise.resolve(response.result))),
      catchError(err => {
        console.error('Perform write API error:', err);
        return throwError(() => new Error('Error performing write operation.'));
      })
    );
  }

  /**
   * Writes the header row to the specified sheet.
   * This should be called only once or when headers need to be re-written.
   * @param sheetName The name of the sheet (e.g., 'Sheet1').
   * @returns An Observable that completes when headers are written.
   */
  writeHeaders(sheetName: string): Observable<any> {
    const headers = [
      'Full Name', 'Job Title', 'Department/Unit(s)', 'Name of Supervisor',
      'Performance Period', 'Group Pastor', 'Church Pastor/Coordinator',
      'KRA 1 - Key Result Area', 'KRA 1 - Specific Achievements', 'KRA 1 - Special Comment',
      'KRA 2 - Key Result Area', 'KRA 2 - Specific Achievements', 'KRA 2 - Special Comment',
      'KRA 3 - Key Result Area', 'KRA 3 - Specific Achievements', 'KRA 3 - Special Comment',
      'Idea 1 - Idea', 'Idea 1 - Impact Made',
      'Idea 2 - Idea', 'Idea 2 - Impact Made',
      'Idea 3 - Idea', 'Idea 3 - Impact Made',
      'Date Created'
    ];
    // This example assumes a max of 3 KRAs and 3 Ideas for consistent headers.
    // Adjust as needed if your form can have more or fewer.
    const headerRange = `${sheetName}!A1`; // Write starting from A1
    return this.writeSheet(headerRange, [headers]).pipe(
      tap(() => console.log('Headers successfully written to sheet.')),
      catchError(err => {
        console.error('Error writing headers to sheet:', err);
        return throwError(() => new Error('Failed to write headers.'));
      })
    );
  }
}