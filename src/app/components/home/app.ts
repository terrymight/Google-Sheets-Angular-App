import { Component, OnDestroy, OnInit } from '@angular/core';
import { GoogleSheets } from '../../services/google-sheets';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, Observable, of, Subject, takeUntil, tap } from 'rxjs';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [ RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

}
