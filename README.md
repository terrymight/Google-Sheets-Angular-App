# Google Sheets Angular App

This Angular application allows users to read from and append data to a Google Sheet using the Google Sheets API and Google Identity Services (GIS) for authentication. The app uses RxJS Observables for asynchronous operations and provides a simple UI to view and add rows to a Google Sheet.

## Features
- Authenticate users with Google Identity Services (OAuth 2.0).
- Read data from a specified Google Sheet range and display it in a table.
- Append new rows to the Google Sheet without overwriting existing data.
- Reactive UI with RxJS Observables for seamless data updates.
- Error handling for authentication, API calls, and invalid inputs.

## Prerequisites
Before setting up the application, ensure you have the following:

1. **Node.js and npm**:
   - Install Node.js (v18 or later recommended) and npm from [nodejs.org](https://nodejs.org/).
2. **Angular CLI**:
   - Install globally: `npm install -g @angular/cli`.
3. **Google Cloud Project**:
   - Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
   - Enable the **Google Sheets API** under **APIs & Services > Library**.
   - Create an **OAuth 2.0 Client ID** (Web application) under **APIs & Services > Credentials**:
     - Add `http://localhost:4200` as an **Authorized redirect URI**.
     - Download the credentials JSON and note the **Client ID**.
   - Configure the **OAuth consent screen**:
     - Add the scope `https://www.googleapis.com/auth/spreadsheets`.
     - Add your Google account email as a test user if in "Testing" mode.
4. **Google Sheet**:
   - Create a Google Sheet and note its **Spreadsheet ID** (from the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`).
   - Share the sheet with the Google account used for authentication (Editor access).

## Installation

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd google-sheets-angular-app