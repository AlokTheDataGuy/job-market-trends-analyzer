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
  Eye
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

// Import API service
import { apiService } from '@/services/api';

/**
 * Table Header Component with Sorting
 * Provides clickable headers with sort indicators
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
 * Growth Rate Badge Component
 * Displays growth rate with appropriate color coding
 */
const GrowthRateBadge = ({ growthRate }) => {
  if (growthRate === null || growthRate === undefined) {
    return (
      <Badge variant="secondary" className="text-xs">
        N/A
      </Badge>
    );
  }

  const isPositive = growthRate > 0;
  const isZero = growthRate === 0;

  return (
    <Badge 
      variant={isPositive ? "default" : isZero ? "secondary" : "destructive"}
      className={`text-xs font-medium ${
        isPositive 
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
          : isZero
          ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      <div className="flex items-center space-x-1">
        {isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : isZero ? (
          <div className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        <span>{isPositive ? '+' : ''}{growthRate.toFixed(1)}%</span>
      </div>
    </Badge>
  );
};

/**
 * Category Badge Component
 * Displays skill category with color coding
 */
const CategoryBadge = ({ category }) => {
  if (!category) {
    return (
      <Badge variant="outline" className="text-xs">
        Uncategorized
      </Badge>
    );
  }

  const categoryColors = {
    'Programming': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Framework': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Database': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Cloud': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'DevOps': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Design': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    'Analytics': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    'Mobile': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
  };

  return (
    <Badge 
      variant="secondary" 
      className={`text-xs ${categoryColors[category] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}
    >
      {category}
    </Badge>
  );
};

/**
 * Main SkillsTable Component
 * Displays skills data in a sortable, filterable table
 */
const SkillsTable = ({ skills: propSkills }) => {
  // State management
  const [skillsData, setSkillsData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
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
        limit: 50,
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
        skill.skill_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
   * Loading Skeleton Component
   */
  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );

  /**
   * Error State Component
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
   * Empty State Component
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
                <span>Most in-demand skills in the market</span>
                {processedSkills.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {processedSkills.length} skills
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
              placeholder="Search skills..."
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
          
          {/* Skills Table */}
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
                        className="min-w-[100px]"
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {processedSkills.map((skill, index) => (
                        <motion.tr
                          key={skill.skill_name || index}
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
                            <div className="font-semibold">
                              {skill.job_count_30d?.toLocaleString() || 0}
                            </div>
                          </TableCell>
                          <TableCell>
                            <GrowthRateBadge growthRate={skill.growth_rate} />
                          </TableCell>
                          <TableCell>
                            <CategoryBadge category={skill.category} />
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          )}

          {/* Table Footer with Summary */}
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
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span className="text-xs">Growing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded bg-red-500" />
                    <span className="text-xs">Declining</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded bg-gray-400" />
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
