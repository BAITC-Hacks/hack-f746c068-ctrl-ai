import type { ActivityType } from '../../../types'

export interface MockActivity {
  id: string
  title: string
  type: ActivityType
  skill: string
  gain: number
  maxLevel: number // выше этого уровня активность навык не поднимает
  durationHours: number
  audience: string[] | 'all' // роли, для которых активность предназначена
}

export const activities: MockActivity[] = [
  { id: 'a1', title: 'Воркшоп: проектирование высоконагруженных систем', type: 'workshop', skill: 'System Design', gain: 1, maxLevel: 4, durationHours: 16, audience: ['Backend Engineer', 'Frontend Engineer'] },
  { id: 'a2', title: 'Архитектурное ревью в паре с Principal Engineer', type: 'mentoring', skill: 'System Design', gain: 2, maxLevel: 5, durationHours: 24, audience: ['Backend Engineer'] },
  { id: 'a3', title: 'Курс «PostgreSQL: оптимизация запросов»', type: 'course', skill: 'Databases', gain: 1, maxLevel: 4, durationHours: 20, audience: ['Backend Engineer'] },
  { id: 'a4', title: 'Наставничество над стажёром (3 месяца)', type: 'mentoring', skill: 'Mentoring', gain: 1, maxLevel: 4, durationHours: 30, audience: 'all' },
  { id: 'a5', title: 'Тренинг «Эффективная коммуникация в команде»', type: 'workshop', skill: 'Communication', gain: 1, maxLevel: 3, durationHours: 8, audience: 'all' },
  { id: 'a6', title: 'Выступление на внутреннем митапе', type: 'project', skill: 'Communication', gain: 1, maxLevel: 4, durationHours: 10, audience: 'all' },
  { id: 'a7', title: 'Дежурный ревьюер критичного сервиса (1 квартал)', type: 'project', skill: 'Code Review', gain: 1, maxLevel: 4, durationHours: 40, audience: ['Backend Engineer', 'Frontend Engineer'] },
  { id: 'a8', title: 'Advanced React: паттерны и производительность', type: 'course', skill: 'React', gain: 1, maxLevel: 5, durationHours: 18, audience: ['Frontend Engineer'] },
  { id: 'a9', title: 'TypeScript: продвинутая типизация', type: 'course', skill: 'TypeScript', gain: 1, maxLevel: 4, durationHours: 14, audience: ['Frontend Engineer'] },
  { id: 'a10', title: 'Внедрение e2e-тестов в продукт', type: 'project', skill: 'Testing', gain: 1, maxLevel: 4, durationHours: 30, audience: ['Frontend Engineer', 'QA Engineer'] },
  { id: 'a11', title: 'Дизайн-спринт с продуктовой командой', type: 'workshop', skill: 'UI/UX', gain: 1, maxLevel: 3, durationHours: 12, audience: ['Frontend Engineer'] },
  { id: 'a12', title: 'Курс «Статистика и A/B-тесты»', type: 'course', skill: 'Statistics', gain: 2, maxLevel: 4, durationHours: 32, audience: ['Data Analyst'] },
  { id: 'a13', title: 'Сертификация Advanced SQL', type: 'certification', skill: 'SQL', gain: 1, maxLevel: 4, durationHours: 20, audience: ['Data Analyst', 'QA Engineer'] },
  { id: 'a14', title: 'Дашборд для руководства в BI', type: 'project', skill: 'Data Visualization', gain: 1, maxLevel: 4, durationHours: 24, audience: ['Data Analyst'] },
  { id: 'a15', title: 'Стажировка в бизнес-подразделении', type: 'project', skill: 'Business Domain', gain: 1, maxLevel: 4, durationHours: 40, audience: ['Data Analyst'] },
  { id: 'a16', title: 'Фреймворк автотестов на Playwright', type: 'course', skill: 'Test Automation', gain: 2, maxLevel: 4, durationHours: 28, audience: ['QA Engineer'] },
  { id: 'a17', title: 'Школа тест-дизайна', type: 'course', skill: 'Test Design', gain: 1, maxLevel: 5, durationHours: 16, audience: ['QA Engineer'] },
  { id: 'a18', title: 'Настройка CI/CD пайплайна для тестов', type: 'project', skill: 'CI/CD', gain: 1, maxLevel: 3, durationHours: 20, audience: ['QA Engineer'] },
  { id: 'a20', title: 'Сертификация CKA (Kubernetes Administrator)', type: 'certification', skill: 'Kubernetes', gain: 2, maxLevel: 5, durationHours: 40, audience: ['DevOps Engineer'] },
  { id: 'a21', title: 'Перевод инфраструктуры на Terraform', type: 'project', skill: 'IaC', gain: 1, maxLevel: 4, durationHours: 32, audience: ['DevOps Engineer'] },
  { id: 'a22', title: 'Воркшоп: observability на Prometheus + Grafana', type: 'workshop', skill: 'Monitoring', gain: 1, maxLevel: 4, durationHours: 12, audience: ['DevOps Engineer', 'Backend Engineer'] },
  { id: 'a23', title: 'Курс «Linux для инженеров эксплуатации»', type: 'course', skill: 'Linux', gain: 1, maxLevel: 4, durationHours: 24, audience: ['DevOps Engineer'] },
  { id: 'a24', title: 'Миграция пайплайнов на GitLab CI', type: 'project', skill: 'CI/CD', gain: 1, maxLevel: 5, durationHours: 30, audience: ['DevOps Engineer'] },
  { id: 'a19', title: 'Python для анализа данных', type: 'course', skill: 'Python', gain: 1, maxLevel: 3, durationHours: 24, audience: ['Data Analyst'] },
]
