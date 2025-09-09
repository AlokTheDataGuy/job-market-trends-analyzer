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
  Building2,
  MapPin,
  PieChart,
  Globe,
  Zap
} from 'lucide-react';

// Import shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Animated Counter Component with Enhanced Formatting
 * Provides smooth number transitions with smart formatting for large values
 */
const AnimatedCounter = ({ value, duration = 1.5, suffix = '', prefix = '', decimals = 0 }) => {
  const count = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const animation = animate(count, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue(latest);
      }
    });

    return animation.stop;
  }, [value, duration]);

  // Enhanced number formatting with better readability
  const formatNumber = (num) => {
    if (num >= 1_000_000) {
      const millions = Math.floor(num / 1_000_000);
      const remainder = num % 1_000_000;

      if (remainder >= 500_000 && remainder < 1_000_000) {
        return (millions + 0.5) + 'M+';
      }
      return millions + 'M+';
    } else if (num >= 1_000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;

      if (remainder >= 500 && remainder < 1000) {
        return (thousands + 0.5) + 'K+';
      }
      return thousands + 'K+';
    }
    return num.toLocaleString();
  };


  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="tabular-nums"
    >
      {prefix}{formatNumber(displayValue)}{suffix}
    </motion.span>
  );
};

/**
 * Compact KPI Card Component
 * Redesigned for minimal space usage while maintaining visual impact
 */
const CompactKPICard = ({ title, value, icon: Icon, gradient, trend, delay = 0, subtitle }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative overflow-hidden"
    >
      <Card className={`h-full ${gradient} border-0 text-white shadow-lg hover:shadow-xl transition-all duration-300`}>
        <CardContent className="p-4 relative">
          {/* Background Pattern */}
          <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
            <Icon className="w-full h-full" />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="text-xs font-medium text-white/80 uppercase tracking-wide">
                  {title}
                </p>
                {subtitle && (
                  <p className="text-xs text-white/60 mt-0.5">{subtitle}</p>
                )}
              </div>
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="text-2xl font-bold mb-1">
              <AnimatedCounter value={value} duration={1.8} />
            </div>

            {trend && (
              <div className="flex items-center">
                <TrendingUp
                  className={`h-3 w-3 mr-1 ${trend > 0 ? 'text-green-200' : 'text-red-200 rotate-180'}`}
                />
                <span className="text-xs font-medium text-white/90">
                  {trend > 0 ? '+' : ''}{trend}% from last period
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Compact Skills List Component
 * Optimized for space efficiency with horizontal layout options
 */
const CompactSkillsList = ({ skills, delay = 0, title, icon: Icon, maxItems = 6 }) => {
  const skillColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500',
    'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500'
  ];

  if (!skills || skills.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
      >
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="h-4 w-4 text-primary" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">No data available</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="h-full hover:shadow-md transition-shadow duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="h-4 w-4 text-primary" />
              {title}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {skills.length} total
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-2">
            {skills.slice(0, maxItems).map((skill, index) => {
              const skillName = typeof skill === 'string'
                ? skill
                : skill._id || skill.skill_name || skill.name || skill.skill || 'Unknown';
              const skillCount = typeof skill === 'object' && skill.count ? skill.count : null;

              return (
                <motion.div
                  key={`${skillName}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: delay + (index * 0.05) }}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${skillColors[index % skillColors.length]}`} />
                    <span className="font-medium text-sm truncate">{skillName}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {skillCount && (
                      <span className="text-xs text-muted-foreground font-mono">
                        <AnimatedCounter value={skillCount} duration={1.2} />
                      </span>
                    )}
                    <Badge variant="secondary" className="text-xs font-bold h-5">
                      #{index + 1}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {skills.length > maxItems && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: delay + 0.3 }}
              className="mt-3 pt-3 border-t text-center"
            >
              <Badge variant="outline" className="text-xs">
                +{skills.length - maxItems} more
              </Badge>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Horizontal Progress List Component
 * For categories with percentage distributions
 */
const HorizontalProgressList = ({ data, delay = 0, title, icon: Icon, colorMap }) => {
  if (!data || (Array.isArray(data) ? data.length === 0 : Object.keys(data).length === 0)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
      >
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="h-4 w-4 text-primary" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">No data available</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Convert object to array if needed
  let dataArray = Array.isArray(data) ? data :
    Object.entries(data).map(([name, count]) => ({ name, count }));

  dataArray = dataArray.sort((a, b) => (b.count || 0) - (a.count || 0));
  const maxCount = Math.max(...dataArray.map(item => item.count || 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="h-full hover:shadow-md transition-shadow duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {dataArray.slice(0, 5).map((item, index) => {
              const percentage = maxCount > 0 ? (item.count / maxCount * 100) : 0;
              const colorClass = colorMap?.[item.name] || `hsl(${(index * 137.5) % 360}, 70%, 50%)`;

              return (
                <motion.div
                  key={`${item.name}-${index}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: delay + (index * 0.1) }}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize truncate flex-1">
                      {item.name || item.location || item.company || 'Unknown'}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs ml-2">
                      <AnimatedCounter value={item.count || 0} duration={1.5} />
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <motion.div
                      className="h-1.5 rounded-full"
                      style={{ backgroundColor: colorClass }}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: delay + (index * 0.1) }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Enhanced Loading Skeleton
 * More compact and visually appealing loading state
 */
const CompactLoadingSkeleton = () => (
  <div className="space-y-4">
    {/* KPI Cards Row */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="h-24">
          <CardContent className="p-4">
            <div className="flex items-center justify-between h-full">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Content Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="h-64">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/**
 * Main MarketSummaryCard Component
 * Completely redesigned for optimal space utilization and visual hierarchy
 */
const MarketSummaryCard = ({ summary, isLoading = false }) => {
  // Loading State
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl shadow-lg">
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Market Overview</h2>
              <p className="text-muted-foreground">Real-time job market insights and trending skills</p>
            </div>
          </div>
          <Badge variant="secondary" className="animate-pulse">
            <Database className="h-3 w-3 mr-1" />
            Loading
          </Badge>
        </div>
        <CompactLoadingSkeleton />
      </motion.div>
    );
  }

  // Error/No Data State
  if (!summary) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <Card className="border-warning bg-warning/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium text-warning-foreground">
                  Market Data Unavailable
                </p>
                <p className="text-sm text-warning-foreground/70">
                  Unable to load market insights at this time. Please try again later.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Prepare KPI data with enhanced metrics
  const kpiData = [
    {
      title: 'Total Jobs',
      subtitle: 'Active positions',
      value: summary.total_jobs || 0,
      icon: Briefcase,
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
      trend: summary.jobs_trend || null
    },
    {
      title: 'Unique Skills',
      subtitle: 'In demand',
      value: summary.total_unique_skills || 0,
      icon: Target,
      gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      trend: summary.skills_trend || null
    },
    {
      title: 'Companies',
      subtitle: 'Actively hiring',
      value: summary.total_companies || 0,
      icon: Building2,
      gradient: 'bg-gradient-to-br from-purple-500 to-purple-600',
      trend: null
    },
    {
      title: 'Locations',
      subtitle: 'Job markets',
      value: summary.total_locations || 0,
      icon: Globe,
      gradient: 'bg-gradient-to-br from-orange-500 to-orange-600',
      trend: null
    }
  ];

  // Define color maps for consistent theming
  const categoryColors = {
    programming: '#3b82f6',
    frontend: '#10b981',
    backend: '#8b5cf6',
    cloud: '#f59e0b',
    databases: '#ec4899',
    mobile: '#06b6d4',
    data: '#6366f1',
    tools: '#059669'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-6"
    >
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
            <TrendingUp className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Market Overview</h2>
            <p className="text-muted-foreground">Real-time job market insights and trending skills</p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-2">
          <Zap className="h-3 w-3" />
          Live Data
        </Badge>
      </div>

      {/* KPI Cards - Compact 4-column layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => (
          <CompactKPICard
            key={kpi.title}
            title={kpi.title}
            subtitle={kpi.subtitle}
            value={kpi.value}
            icon={kpi.icon}
            gradient={kpi.gradient}
            trend={kpi.trend}
            delay={index * 0.1}
          />
        ))}
      </div>

      {/* Main Content Grid - 3 columns for optimal space usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Skills */}
        <CompactSkillsList
          skills={summary.top_skills}
          delay={0.2}
          title="Top Skills"
          icon={Star}
          maxItems={8}
        />

        {/* Top Companies */}
        <CompactSkillsList
          skills={summary.top_companies?.map(company => ({
            name: company.company || 'Unknown Company',
            count: company.job_count || 0,
            _id: company.company
          }))}
          delay={0.3}
          title="Top Companies"
          icon={Building2}
          maxItems={8}
        />

        {/* Top Locations */}
        <CompactSkillsList
          skills={summary.top_locations?.map(location => ({
            name: location.location || 'Remote/Unspecified',
            count: location.job_count || 0,
            _id: location.location
          }))}
          delay={0.4}
          title="Top Locations"
          icon={MapPin}
          maxItems={8}
        />
      </div>

      {/* Skill Categories - Full width for better visualization */}
      {summary.skill_categories && Object.keys(summary.skill_categories).length > 0 && (
        <HorizontalProgressList
          data={summary.skill_categories}
          delay={0.5}
          title="Skill Categories Distribution"
          icon={PieChart}
          colorMap={categoryColors}
        />
      )}
    </motion.div>
  );
};

export default MarketSummaryCard;
