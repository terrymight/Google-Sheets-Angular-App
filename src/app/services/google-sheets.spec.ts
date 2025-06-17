import { TestBed } from '@angular/core/testing';

import { GoogleSheets } from './google-sheets';

describe('GoogleSheets', () => {
  let service: GoogleSheets;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GoogleSheets);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
