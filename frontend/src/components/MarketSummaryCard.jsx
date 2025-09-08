// src/components/MarketSummaryCard.jsx
import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { 
  Briefcase, 
  Target, 
  TrendingUp, 
  Activity,
  Database,
  Star,
  BarChart3
} from 'lucide-react';

// Import shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Animated Counter Component
 * Counts up from 0 to target value with smooth animation
 */
const AnimatedCounter = ({ value, duration = 2, suffix = '', prefix = '' }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const animation = animate(count, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      }
    });

    return animation.stop;
  }, [value, duration]);

  // Format large numbers
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {prefix}{formatNumber(displayValue)}{suffix}
    </motion.span>
  );
};

/**
 * KPI Card Component
 * Individual metric display card with icon and animated value
 */
const KPICard = ({ title, value, icon: Icon, color, trend, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="flex-1 min-w-0"
    >
      <Card className="h-full bg-gradient-to-br from-background to-muted/20 border-l-4 border-l-primary-500">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {title}
              </p>
              <div className="text-3xl font-bold text-foreground">
                <AnimatedCounter value={value} duration={2} />
              </div>
              {trend && (
                <div className="flex items-center mt-2">
                  <TrendingUp 
                    className={`h-4 w-4 mr-1 ${
                      trend > 0 ? 'text-green-500' : 'text-red-500'
                    }`} 
                  />
                  <span 
                    className={`text-sm font-medium ${
                      trend > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {trend > 0 ? '+' : ''}{trend}%
                  </span>
                </div>
              )}
            </div>
            <div className={`flex-shrink-0 p-3 rounded-full ${color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Top Skills Section Component
 * Displays trending skills as colored badges
 */
const TopSkillsSection = ({ skills, delay = 0 }) => {
  const skillColors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-emerald-500'
  ];

  if (!skills || skills.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="flex-1 min-w-0"
      >
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Star className="h-5 w-5 text-yellow-500" />
              <span>Top Skills</span>
            </CardTitle>
            <CardDescription>Most in-demand skills</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No skills data available
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="flex-1 min-w-0"
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Star className="h-5 w-5 text-yellow-500" />
            <span>Top Skills</span>
          </CardTitle>
          <CardDescription>Most in-demand skills this period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {skills.slice(0, 5).map((skill, index) => {
              const skillName = typeof skill === 'string' 
                ? skill 
                : skill._id || skill.skill_name || skill.name || 'Unknown';
              const skillCount = typeof skill === 'object' && skill.count 
                ? skill.count 
                : null;

              return (
                <motion.div
                  key={skillName}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: delay + (index * 0.1) }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div 
                      className={`w-3 h-3 rounded-full ${
                        skillColors[index % skillColors.length]
                      }`}
                    />
                    <span className="font-medium text-foreground truncate">
                      {skillName}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {skillCount && (
                      <Badge variant="secondary" className="text-xs">
                        <AnimatedCounter 
                          value={skillCount} 
                          duration={1.5} 
                        />
                      </Badge>
                    )}
                    <Badge 
                      variant="outline" 
                      className="text-xs font-bold text-primary-600"
                    >
                      #{index + 1}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
            
            {skills.length > 5 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: delay + 0.5 }}
                className="pt-2 border-t border-border"
              >
                <p className="text-xs text-muted-foreground text-center">
                  +{skills.length - 5} more skills tracked
                </p>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Loading Skeleton Component
 * Shows skeleton while data is loading
 */
const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* KPI Cards Skeleton */}
      {[...Array(2)].map((_, i) => (
        <Card key={i} className="h-full">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Top Skills Skeleton */}
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-5 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

/**
 * Main MarketSummaryCard Component
 * Displays market overview with KPIs and top skills
 */
const MarketSummaryCard = ({ summary, isLoading = false }) => {
  // Show loading skeleton if data is loading
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Market Overview</span>
            </CardTitle>
            <CardDescription>
              Real-time job market insights and trending skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingSkeleton />
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Handle missing or empty summary data
  if (!summary) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <Card className="border-warning-200 bg-warning-50 dark:bg-warning-900/10">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-warning-500" />
              <p className="text-warning-700 dark:text-warning-400">
                Market summary data is currently unavailable
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const kpiData = [
    {
      title: 'Total Jobs',
      value: summary.total_jobs || 0,
      icon: Briefcase,
      color: 'bg-primary-500',
      trend: summary.jobs_trend || null
    },
    {
      title: 'Unique Skills',
      value: summary.unique_skills || 0,
      icon: Target,
      color: 'bg-green-500',
      trend: summary.skills_trend || null
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Market Overview</span>
          </CardTitle>
          <CardDescription className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Real-time job market insights and trending skills</span>
            <Badge variant="secondary" className="ml-2">
              Live Data
            </Badge>
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* KPI Cards */}
            {kpiData.map((kpi, index) => (
              <KPICard
                key={kpi.title}
                title={kpi.title}
                value={kpi.value}
                icon={kpi.icon}
                color={kpi.color}
                trend={kpi.trend}
                delay={index * 0.1}
              />
            ))}
            
            {/* Top Skills Section */}
            <TopSkillsSection 
              skills={summary.top_skills} 
              delay={0.2}
            />
          </div>
          
          {/* Additional Stats Row */}
          {(summary.active_companies || summary.locations_count) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-6 pt-6 border-t border-border"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                {summary.active_companies && (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-foreground">
                      <AnimatedCounter value={summary.active_companies} duration={2} />
                    </p>
                    <p className="text-sm text-muted-foreground">Companies</p>
                  </div>
                )}
                {summary.locations_count && (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-foreground">
                      <AnimatedCounter value={summary.locations_count} duration={2} />
                    </p>
                    <p className="text-sm text-muted-foreground">Locations</p>
                  </div>
                )}
                {summary.average_salary && (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-foreground">
                      <AnimatedCounter 
                        value={summary.average_salary} 
                        duration={2} 
                        prefix="$"
                        suffix="K"
                      />
                    </p>
                    <p className="text-sm text-muted-foreground">Avg Salary</p>
                  </div>
                )}
                {summary.remote_jobs_percent && (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-foreground">
                      <AnimatedCounter 
                        value={summary.remote_jobs_percent} 
                        duration={2} 
                        suffix="%"
                      />
                    </p>
                    <p className="text-sm text-muted-foreground">Remote Jobs</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MarketSummaryCard;
