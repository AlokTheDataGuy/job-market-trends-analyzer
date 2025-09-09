// src/components/SkillsTable.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Filter,
  RefreshCw,
  AlertCircle,
  Eye,
  Info,
  Calendar,
  Building2,
  MapPin,
  Activity
} from 'lucide-react';

// Import shadcn/ui components
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

// Import API service
import { apiService } from '@/services/api';

/**
 * Enhanced Growth Rate Badge with Tooltip Details
 */
const EnhancedGrowthRateBadge = ({ skill }) => {
  const { growth_rate, growth_rates_detail, trend_direction } = skill;
  
  if (growth_rate === null || growth_rate === undefined) {
    return (
      <Badge variant="secondary" className="text-xs">
        N/A
      </Badge>
    );
  }

  const isPositive = growth_rate > 0;
  const isZero = growth_rate === 0;

  // Determine trend icon and color
  const getTrendIcon = () => {
    switch (trend_direction) {
      case 'up': return <TrendingUp className="h-3 w-3" />;
      case 'down': return <TrendingDown className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  const getTrendColor = () => {
    switch (trend_direction) {
      case 'up': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'down': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline"
            className={`text-xs font-medium cursor-help ${getTrendColor()}`}
          >
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span>{isPositive ? '+' : ''}{growth_rate.toFixed(1)}%</span>
            </div>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-xs space-y-1">
            <div className="font-semibold">Growth Details</div>
            {growth_rates_detail && (
              <>
                {growth_rates_detail['7d_vs_23d'] && (
                  <div>Recent (7d): {growth_rates_detail['7d_vs_23d'].toFixed(1)}%</div>
                )}
                {growth_rates_detail['30d_vs_30d'] && (
                  <div>Medium-term: {growth_rates_detail['30d_vs_30d'].toFixed(1)}%</div>
                )}
                <div className="text-muted-foreground">
                  Trend: {trend_direction || 'stable'}
                </div>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Enhanced Category Badge with Better Mapping
 */
const EnhancedCategoryBadge = ({ category }) => {
  if (!category) {
    return (
      <Badge variant="outline" className="text-xs">
        Other
      </Badge>
    );
  }

  // Map backend categories to display categories
  const categoryMapping = {
    'programming': 'Programming',
    'frontend': 'Frontend',
    'backend': 'Backend',
    'databases': 'Database',
    'cloud': 'Cloud',
    'mobile': 'Mobile',
    'data': 'Analytics',
    'tools': 'DevOps'
  };

  const displayCategory = categoryMapping[category.toLowerCase()] || 
    category.charAt(0).toUpperCase() + category.slice(1);

  const categoryColors = {
    'Programming': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Frontend': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Backend': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Database': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Cloud': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'DevOps': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Analytics': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    'Mobile': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
  };

  return (
    <Badge 
      variant="secondary" 
      className={`text-xs ${categoryColors[displayCategory] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}
    >
      {displayCategory}
    </Badge>
  );
};

/**
 * Job Count Progress Bar with Multiple Periods
 */
const JobCountDisplay = ({ skill }) => {
  const { job_count_7d, job_count_30d, job_count_60d } = skill;
  const maxCount = Math.max(job_count_7d || 0, job_count_30d || 0, job_count_60d || 0);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">
            <div className="font-semibold text-sm">
              {(job_count_30d || 0).toLocaleString()}
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-1">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${maxCount > 0 ? ((job_count_30d || 0) / maxCount) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-xs space-y-1">
            <div className="font-semibold">Job Distribution</div>
            <div>Last 7 days: {(job_count_7d || 0).toLocaleString()}</div>
            <div>Last 30 days: {(job_count_30d || 0).toLocaleString()}</div>
            <div>Last 60 days: {(job_count_60d || 0).toLocaleString()}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Skill Detail Expandable Row
 */
const SkillDetailRow = ({ skill, isExpanded }) => {
  if (!isExpanded) return null;

  return (
    <motion.tr
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <TableCell colSpan={5} className="bg-muted/30 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Companies */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Top Companies</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {(skill.companies_hiring || []).slice(0, 5).map((company, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {company}
                </Badge>
              ))}
              {(skill.companies_hiring || []).length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{(skill.companies_hiring || []).length - 5} more
                </Badge>
              )}
            </div>
          </div>

          {/* Locations */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Top Locations</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {(skill.top_locations || []).slice(0, 5).map((location, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {location}
                </Badge>
              ))}
              {(skill.top_locations || []).length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{(skill.top_locations || []).length - 5} more
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Salary Information */}
        {(skill.avg_salary_min || skill.avg_salary_max) && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Avg. Salary: ₹{(skill.avg_salary_min || 0).toLocaleString()} - ₹{(skill.avg_salary_max || 0).toLocaleString()}
            </div>
          </div>
        )}
      </TableCell>
    </motion.tr>
  );
};

/**
 * Main Enhanced SkillsTable Component
 */
const SkillsTable = ({ skills: propSkills }) => {
  // State management
  const [skillsData, setSkillsData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({
    key: 'job_count_30d',
    direction: 'desc'
  });

  /**
   * Fetch trending skills data from API
   */
  const fetchSkillsData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiService.getTrendingSkills({
        limit: 20,
        sort_by: 'job_count_30d'
      });

      if (response && response.skills) {
        setSkillsData(response.skills);
      } else {
        setSkillsData([]);
      }
    } catch (error) {
      console.error('Failed to fetch skills data:', error);
      setError(error.message || 'Failed to load skills data');
      setSkillsData([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle row expansion
   */
  const toggleRowExpansion = (skillName) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(skillName)) {
      newExpanded.delete(skillName);
    } else {
      newExpanded.add(skillName);
    }
    setExpandedRows(newExpanded);
  };

  /**
   * Handle sorting configuration
   */
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  /**
   * Filter and sort skills data based on current state
   */
  const processedSkills = useMemo(() => {
    let filtered = skillsData;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(skill =>
        skill.skill_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        skill.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle null/undefined values
        if (aValue === null || aValue === undefined) aValue = 0;
        if (bValue === null || bValue === undefined) bValue = 0;

        // Handle string comparison for skill names
        if (sortConfig.key === 'skill_name') {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [skillsData, searchTerm, sortConfig]);

  /**
   * Load data on component mount or when prop skills change
   */
  useEffect(() => {
    if (propSkills && Array.isArray(propSkills)) {
      setSkillsData(propSkills);
      setIsLoading(false);
    } else {
      fetchSkillsData();
    }
  }, [propSkills]);

  /**
   * SortableHeader Component (same as before)
   */
  const SortableHeader = ({ children, sortKey, currentSort, onSort, className = "" }) => {
    const isActive = currentSort.key === sortKey;
    const direction = currentSort.direction;

    return (
      <TableHead className={`cursor-pointer select-none ${className}`}>
        <div 
          className="flex items-center space-x-1 hover:text-foreground transition-colors"
          onClick={() => onSort(sortKey)}
        >
          <span>{children}</span>
          <div className="flex flex-col">
            <ChevronUp 
              className={`h-3 w-3 ${
                isActive && direction === 'asc' 
                  ? 'text-primary-600' 
                  : 'text-muted-foreground/50'
              }`} 
            />
            <ChevronDown 
              className={`h-3 w-3 -mt-1 ${
                isActive && direction === 'desc' 
                  ? 'text-primary-600' 
                  : 'text-muted-foreground/50'
              }`} 
            />
          </div>
        </div>
      </TableHead>
    );
  };

  /**
   * Loading Skeleton Component (same as before)
   */
  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );

  /**
   * Error State Component (same as before)
   */
  const ErrorState = () => (
    <Alert className="border-error-200 bg-error-50 dark:bg-error-900/10">
      <AlertCircle className="h-4 w-4 text-error-500" />
      <AlertDescription className="text-error-700 dark:text-error-400">
        {error}
        <Button 
          variant="link" 
          size="sm" 
          onClick={fetchSkillsData}
          className="ml-2 text-error-600 hover:text-error-700"
        >
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );

  /**
   * Empty State Component (same as before)
   */
  const EmptyState = () => (
    <div className="text-center py-12">
      <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-muted-foreground mb-2">
        No skills found
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {searchTerm 
          ? `No skills match "${searchTerm}". Try a different search term.`
          : 'No skills data available at the moment.'
        }
      </p>
      {searchTerm && (
        <Button 
          variant="outline" 
          onClick={() => setSearchTerm('')}
        >
          Clear search
        </Button>
      )}
    </div>
  );

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
                <Target className="h-5 w-5" />
                <span>Trending Skills</span>
              </CardTitle>
              <CardDescription className="flex items-center space-x-2 mt-1">
                <Eye className="h-4 w-4" />
                <span>Most in-demand skills based on job posting trends</span>
                {processedSkills.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    Top {processedSkills.length} skills
                  </Badge>
                )}
              </CardDescription>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchSkillsData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search skills or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                ×
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Error State */}
          {error && <ErrorState />}
          
          {/* Loading State */}
          {isLoading && !error && <LoadingSkeleton />}
          
          {/* Empty State */}
          {!isLoading && !error && processedSkills.length === 0 && <EmptyState />}
          
          {/* Enhanced Skills Table */}
          {!isLoading && !error && processedSkills.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="rounded-md border overflow-hidden"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <SortableHeader
                        sortKey="skill_name"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className="min-w-[150px]"
                      >
                        Skill
                      </SortableHeader>
                      <SortableHeader
                        sortKey="job_count_30d"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className="min-w-[120px]"
                      >
                        Jobs (30d)
                      </SortableHeader>
                      <SortableHeader
                        sortKey="growth_rate"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className="min-w-[120px]"
                      >
                        Growth Rate
                      </SortableHeader>
                      <SortableHeader
                        sortKey="category"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className="min-w-[120px]"
                      >
                        Category
                      </SortableHeader>
                      <TableHead className="w-[50px]">
                        Details
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {processedSkills.map((skill, index) => {
                        const skillKey = skill.skill_name || `skill-${index}`;
                        const isExpanded = expandedRows.has(skillKey);
                        
                        return (
                          <React.Fragment key={skillKey}>
                            <motion.tr
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2, delay: index * 0.02 }}
                              className="hover:bg-muted/50 transition-colors"
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 rounded-full bg-primary-500 opacity-60" />
                                  <span className="truncate max-w-[120px] sm:max-w-none">
                                    {skill.skill_name}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <JobCountDisplay skill={skill} />
                              </TableCell>
                              <TableCell>
                                <EnhancedGrowthRateBadge skill={skill} />
                              </TableCell>
                              <TableCell>
                                <EnhancedCategoryBadge category={skill.category} />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleRowExpansion(skillKey)}
                                  className="h-8 w-8 p-0"
                                >
                                  <ChevronDown 
                                    className={`h-4 w-4 transition-transform duration-200 ${
                                      isExpanded ? 'rotate-180' : ''
                                    }`} 
                                  />
                                </Button>
                              </TableCell>
                            </motion.tr>
                            <SkillDetailRow 
                              skill={skill} 
                              isExpanded={isExpanded} 
                            />
                          </React.Fragment>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          )}

          {/* Enhanced Table Footer */}
          {!isLoading && !error && processedSkills.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mt-4 p-4 bg-muted/30 rounded-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 text-sm text-muted-foreground">
                <div>
                  Showing {processedSkills.length} skill{processedSkills.length !== 1 ? 's' : ''}
                  {searchTerm && (
                    <span> matching "{searchTerm}"</span>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs">Growing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    <span className="text-xs">Declining</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Activity className="h-3 w-3 text-gray-400" />
                    <span className="text-xs">Stable</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SkillsTable;
