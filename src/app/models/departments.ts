export interface Department {
  name: string;
}

// Alternatively, if you just need a type for the department names:
export type DepartmentName = 
  | 'Administration'
  | 'Human Resources'
  | 'Finance'
  | 'Operations'
  | 'Marketing'
  | 'IT'
  | 'Pastoral Care'
  | 'Worship'
  | 'Children Ministry'
  | 'Youth Ministry';

// You could also create an enum if that suits your needs better:
export enum DepartmentEnum {
  Administration = 'Administration',
  HumanResources = 'Human Resources',
  Finance = 'Finance',
  Operations = 'Operations',
  Marketing = 'Marketing',
  IT = 'IT',
  PastoralCare = 'Pastoral Care',
  Worship = 'Worship',
  ChildrenMinistry = 'Children Ministry',
  YouthMinistry = 'Youth Ministry'
}