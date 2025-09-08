// src/components/TrendChart.test.jsx
import TrendChart from './TrendChart';

// Test with mock data
const mockData = [
  {
    skill_name: 'React',
    history: [
      { date: '2024-09-01', count: 150 },
      { date: '2024-09-02', count: 165 },
      { date: '2024-09-03', count: 180 }
    ]
  },
  {
    skill_name: 'Python',
    history: [
      { date: '2024-09-01', count: 200 },
      { date: '2024-09-02', count: 190 },
      { date: '2024-09-03', count: 210 }
    ]
  }
];

function TestTrendChart() {
  return <TrendChart data={mockData} />;
}
