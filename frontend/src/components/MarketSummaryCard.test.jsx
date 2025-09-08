// Test with mock data
const mockSummary = {
  total_jobs: 15420,
  unique_skills: 387,
  top_skills: [
    { _id: 'React', count: 1250 },
    { _id: 'Python', count: 1100 },
    { _id: 'JavaScript', count: 950 },
    { _id: 'Node.js', count: 820 },
    { _id: 'AWS', count: 760 }
  ],
  jobs_trend: 12.5,
  skills_trend: 8.3,
  active_companies: 2840,
  locations_count: 156
};

function TestMarketSummaryCard() {
  return <MarketSummaryCard summary={mockSummary} />;
}
