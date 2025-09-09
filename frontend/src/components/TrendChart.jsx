// src/components/TrendChart.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  Eye,
  EyeOff,
  BarChart3,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

// Import shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import API service
import { apiService } from '@/services/api';

/**
 * Custom Tooltip Component for the chart
 * Displays skill name, count, and formatted date
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg"
    >
      <div className="text-sm font-semibold text-foreground mb-2">
        {new Date(label).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}
      </div>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">
              {entry.dataKey}:
            </span>
            <span className="text-sm font-semibold text-foreground">
              {entry.value?.toLocaleString() || 0} jobs
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/**
 * Custom Legend Component with toggle functionality
 */
const CustomLegend = ({ payload, visibleSkills, onToggleSkill }) => {
  if (!payload || payload.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
      {payload.map((entry, index) => {
        const isVisible = visibleSkills[entry.dataKey];
        return (
          <motion.button
            key={entry.dataKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            onClick={() => onToggleSkill(entry.dataKey)}
            className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${isVisible
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
          >
            {isVisible ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: isVisible ? entry.color : '#ccc' }}
            />
            <span>{entry.dataKey}</span>
          </motion.button>
        );
      })}
    </div>
  );
};

/**
 * Main TrendChart Component
 * Displays skill trends over time with interactive features
 */
const TrendChart = ({ data: propData }) => {
  // State management
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [visibleSkills, setVisibleSkills] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [skillsData, setSkillsData] = useState([]);

  // Time range options
  const timeRangeOptions = [
    { value: '7d', label: '7 Days', days: 7 },
    { value: '30d', label: '30 Days', days: 30 },
    { value: '90d', label: '90 Days', days: 90 }
  ];

  // Chart color palette
  const chartColors = [
    '#0ea5e9', // Primary blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
    '#ec4899', // Pink
    '#6366f1'  // Indigo
  ];

  /**
   * Fetch trending skills and their analytics data
   */
  const fetchTrendData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const currentRange = timeRangeOptions.find(range => range.value === selectedTimeRange);

      // Fetch trending skills for the selected time range
      const trendingResponse = await apiService.getTrendingSkills({
        days: currentRange.days,
        limit: 10,
        sort_by: 'job_count_30d'
      });

      if (!trendingResponse.skills || trendingResponse.skills.length === 0) {
        setChartData([]);
        setSkillsData([]);
        return;
      }

      // Fetch analytics for each trending skill
      const skillsWithAnalytics = await Promise.allSettled(
        trendingResponse.skills.slice(0, 8).map(async (skill) => {
          try {
            const analytics = await apiService.getSkillAnalytics(
              skill.skill_name,
              currentRange.days
            );

            // Validate the response
            if (!analytics || !analytics.timeline) {
              console.warn(`Invalid analytics response for ${skill.skill_name}`);
              return null;
            }

            // Filter out empty timelines
            if (analytics.timeline.length === 0) {
              console.warn(`Empty timeline for ${skill.skill_name}`);
              return null;
            }

            return {
              skill_name: skill.skill_name,
              history: analytics.timeline,
              total_jobs: analytics.total_jobs || 0,
              growth_rate: skill.growth_rate || 0
            };
          } catch (error) {
            console.warn(`Failed to get analytics for ${skill.skill_name}:`, error);
            return null;
          }
        })
      );

      // Process successful results
      const validSkills = skillsWithAnalytics
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(skill => skill.history && skill.history.length > 0);

      setSkillsData(validSkills);

      // Initialize visibility state for all skills
      const initialVisibility = {};
      validSkills.forEach((skill, index) => {
        initialVisibility[skill.skill_name] = index < 5; // Show first 5 by default
      });
      setVisibleSkills(initialVisibility);

    } catch (error) {
      console.error('Failed to fetch trend data:', error);
      setError(error.message || 'Failed to load trend data');
      setChartData([]);
      setSkillsData([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Process skills data into chart-ready format
   */
  const processedChartData = useMemo(() => {
    if (!skillsData || skillsData.length === 0) return [];

    // Get all unique dates from all skills
    const allDates = new Set();
    skillsData.forEach(skill => {
      skill.history.forEach(point => {
        allDates.add(point.date);
      });
    });

    // Sort dates
    const sortedDates = Array.from(allDates).sort();

    // Create chart data points
    return sortedDates.map(date => {
      const dataPoint = { date };

      skillsData.forEach(skill => {
        const historyPoint = skill.history.find(h => h.date === date);
        dataPoint[skill.skill_name] = historyPoint ? historyPoint.count : 0;
      });

      return dataPoint;
    });
  }, [skillsData]);

  /**
   * Toggle skill visibility in chart
   */
  const toggleSkillVisibility = (skillName) => {
    setVisibleSkills(prev => ({
      ...prev,
      [skillName]: !prev[skillName]
    }));
  };

  /**
   * Handle time range change
   */
  const handleTimeRangeChange = (newRange) => {
    setSelectedTimeRange(newRange);
  };

  // Load data when component mounts or time range changes
  useEffect(() => {
    if (!propData) {
      fetchTrendData();
    }
  }, [selectedTimeRange, propData]);

  // Use prop data if provided, otherwise use fetched data
  useEffect(() => {
    if (propData && Array.isArray(propData)) {
      setSkillsData(propData);
      setChartData(propData);

      // Initialize visibility for prop data
      const initialVisibility = {};
      propData.forEach((skill, index) => {
        initialVisibility[skill.skill_name] = index < 5;
      });
      setVisibleSkills(initialVisibility);
    }
  }, [propData]);

  // Update chart data when skills data or visibility changes
  useEffect(() => {
    if (processedChartData.length > 0) {
      setChartData(processedChartData);
    }
  }, [processedChartData, visibleSkills]);

  /**
   * Loading State Component
   */
  const LoadingState = () => (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-[400px] flex items-center justify-center">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading skill trends...</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-20" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  /**
   * Error State Component
   */
  const ErrorState = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Skill Trends</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="border-error-200 bg-error-50 dark:bg-error-900/10">
          <AlertCircle className="h-4 w-4 text-error-500" />
          <AlertDescription className="text-error-700 dark:text-error-400">
            {error}
            <Button
              variant="link"
              size="sm"
              onClick={fetchTrendData}
              className="ml-2 text-error-600 hover:text-error-700"
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );

  /**
   * Empty State Component
   */
  const EmptyState = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Skill Trends</span>
        </CardTitle>
        <CardDescription>Track skill demand over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] flex flex-col items-center justify-center text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            No trend data available
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            There's no skill trend data available for the selected time range.
            Try selecting a different time period.
          </p>
          <Button
            variant="outline"
            onClick={fetchTrendData}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Render loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Render error state
  if (error) {
    return <ErrorState />;
  }

  // Render empty state
  if (!chartData || chartData.length === 0) {
    return <EmptyState />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Skill Trends</span>
              </CardTitle>
              <CardDescription className="flex items-center space-x-2 mt-1">
                <Calendar className="h-4 w-4" />
                <span>Job demand over time</span>
                {skillsData.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {skillsData.length} skills
                  </Badge>
                )}
              </CardDescription>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center space-x-2">
              <Select value={selectedTimeRange} onValueChange={handleTimeRangeChange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRangeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchTrendData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Chart Container */}
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                />

                {/* Render lines for each visible skill */}
                {skillsData.map((skill, index) => {
                  const isVisible = visibleSkills[skill.skill_name];
                  if (!isVisible) return null;

                  return (
                    <Line
                      key={skill.skill_name}
                      type="monotone"
                      dataKey={skill.skill_name}
                      stroke={chartColors[index % chartColors.length]}
                      strokeWidth={2}
                      dot={{
                        fill: chartColors[index % chartColors.length],
                        strokeWidth: 2,
                        r: 3
                      }}
                      activeDot={{
                        r: 5,
                        stroke: chartColors[index % chartColors.length],
                        strokeWidth: 2,
                        fill: 'hsl(var(--background))'
                      }}
                      animationDuration={1500}
                      animationEasing="ease-out"
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Legend with Toggle Functionality */}
          <CustomLegend
            payload={skillsData.map((skill, index) => ({
              dataKey: skill.skill_name,
              color: chartColors[index % chartColors.length],
              value: skill.skill_name
            }))}
            visibleSkills={visibleSkills}
            onToggleSkill={toggleSkillVisibility}
          />

          {/* Skills Summary Stats */}
          {skillsData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-6 p-4 bg-muted/50 rounded-lg"
            >
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                Top Performing Skills
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {skillsData.slice(0, 6).map((skill, index) => (
                  <div key={skill.skill_name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: chartColors[index % chartColors.length] }}
                      />
                      <span className="text-sm font-medium truncate">
                        {skill.skill_name}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {skill.total_jobs?.toLocaleString() || 0}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TrendChart;
