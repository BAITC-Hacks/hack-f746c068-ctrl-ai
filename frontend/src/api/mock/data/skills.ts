import type { Grade } from '../../../types'

// Требования к навыкам: роль → grade → { навык: требуемый уровень }
export const roleRequirements: Record<string, Partial<Record<Grade, Record<string, number>>>> = {
  'Backend Engineer': {
    Middle: { Python: 3, 'System Design': 2, Databases: 3, 'Code Review': 2, Communication: 2, Mentoring: 1 },
    Senior: { Python: 4, 'System Design': 4, Databases: 4, 'Code Review': 3, Communication: 3, Mentoring: 2 },
    Lead: { Python: 4, 'System Design': 5, Databases: 4, 'Code Review': 4, Communication: 4, Mentoring: 4 },
  },
  'Frontend Engineer': {
    Middle: { React: 3, TypeScript: 3, 'UI/UX': 2, Testing: 2, Communication: 2, 'System Design': 1 },
    Senior: { React: 4, TypeScript: 4, 'UI/UX': 3, Testing: 3, Communication: 3, 'System Design': 3 },
    Lead: { React: 5, TypeScript: 4, 'UI/UX': 4, Testing: 4, Communication: 4, 'System Design': 4 },
  },
  'Data Analyst': {
    Middle: { SQL: 3, Python: 2, Statistics: 2, 'Data Visualization': 3, Communication: 2, 'Business Domain': 2 },
    Senior: { SQL: 4, Python: 3, Statistics: 4, 'Data Visualization': 4, Communication: 3, 'Business Domain': 3 },
    Lead: { SQL: 4, Python: 4, Statistics: 4, 'Data Visualization': 4, Communication: 4, 'Business Domain': 5 },
  },
  'QA Engineer': {
    Middle: { 'Test Automation': 2, 'Test Design': 3, SQL: 2, 'CI/CD': 2, Communication: 2 },
    Senior: { 'Test Automation': 4, 'Test Design': 4, SQL: 3, 'CI/CD': 3, Communication: 3 },
    Lead: { 'Test Automation': 4, 'Test Design': 5, SQL: 3, 'CI/CD': 4, Communication: 4 },
  },
  'DevOps Engineer': {
    Middle: { Linux: 3, Kubernetes: 2, 'CI/CD': 3, Monitoring: 2, IaC: 2, Communication: 2 },
    Senior: { Linux: 4, Kubernetes: 4, 'CI/CD': 4, Monitoring: 3, IaC: 3, Communication: 3 },
    Lead: { Linux: 4, Kubernetes: 5, 'CI/CD': 4, Monitoring: 4, IaC: 4, Communication: 4 },
  },
}

// Раздел (отдел), к которому относится роль. По нему группируется список сотрудников.
export const departmentOfRole: Record<string, string> = {
  'Backend Engineer': 'Backend-разработка',
  'Frontend Engineer': 'Frontend-разработка',
  'Data Analyst': 'Аналитика данных',
  'QA Engineer': 'Тестирование (QA)',
  'DevOps Engineer': 'DevOps и инфраструктура',
}

export const gradeOrder: Grade[] = ['Junior', 'Middle', 'Senior', 'Lead']

export function nextGradeOf(g: Grade): Grade | null {
  const i = gradeOrder.indexOf(g)
  return i >= 0 && i < gradeOrder.length - 1 ? gradeOrder[i + 1] : null
}
