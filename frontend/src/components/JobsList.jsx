// src/components/JobsList.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, 
  MapPin, 
  Building, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  RefreshCw,
  AlertCircle,
  Search
} from 'lucide-react';

// Import shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import API service
import { apiService } from '@/services/api';

/**
 * Utility function to format relative time
 */
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now - date;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

  const exactDate = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });

  if (diffInDays > 30) {
    // Only show exact date if too old
    return exactDate;
  } else if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  } else {
    return `Just now (${exactDate})`;
  }
};


/**
 * Skill Badge Component
 * Renders individual skill tags with color coding
 */
const SkillBadge = ({ skill, index }) => {
  const skillColors = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  ];

  const colorClass = skillColors[index % skillColors.length];
  const skillText = typeof skill === 'string' ? skill : skill.skill || skill.name || 'Unknown';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      <Badge 
        variant="secondary"
        className={`text-xs px-2 py-1 rounded-full font-medium ${colorClass}`}
      >
        {skillText}
      </Badge>
    </motion.div>
  );
};

/**
 * Job Card Component
 * Individual job listing card with hover animations
 */
const JobCard = ({ job, index }) => {
  const skills = Array.isArray(job.skills_extracted) ? job.skills_extracted : [];
  const postedDate = job.posted_date;
  const relativePosted = formatRelativeTime(postedDate);

  return (
    <motion.a
      href={job.job_url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="h-full block"
    >
      <Card className="h-full hover:shadow-lg transition-shadow duration-200 cursor-pointer border-l-4 border-l-primary-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-foreground leading-tight line-clamp-2">
            {job.title || 'Untitled Position'}
          </CardTitle>
          <CardDescription className="flex items-center space-x-4 text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Building className="h-4 w-4" />
              <span className="font-medium">
                {job.company || 'Unknown Company'}
              </span>
            </div>
            {job.location && (
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span className="truncate max-w-[120px]">{job.location}</span>
              </div>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Skills */}
          {skills.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {skills.slice(0, 6).map((skill, skillIndex) => (
                  <SkillBadge 
                    key={skillIndex} 
                    skill={skill} 
                    index={skillIndex}
                  />
                ))}
                {skills.length > 6 && (
                  <Badge variant="outline" className="text-xs px-2 py-1 rounded-full font-medium text-muted-foreground">
                    +{skills.length - 6} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Posted Date */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{relativePosted}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              <Briefcase className="h-3 w-3 mr-1" />
              Job
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.a>
  );
};




/**
 * Pagination Component
 * Handles page navigation with prev/next buttons
 */
const Pagination = ({ currentPage, totalPages, onPageChange, jobsPerPage, totalJobs }) => {
  const startJob = (currentPage - 1) * jobsPerPage + 1;
  const endJob = Math.min(currentPage * jobsPerPage, totalJobs);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 mt-6 pt-6 border-t border-border"
    >
      <div className="text-sm text-muted-foreground">
        Showing {startJob}-{endJob} of {totalJobs} jobs
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center space-x-1"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>
        
        <div className="flex items-center space-x-1">
          {[...Array(Math.min(5, totalPages))].map((_, index) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = index + 1;
            } else if (currentPage <= 3) {
              pageNum = index + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + index;
            } else {
              pageNum = currentPage - 2 + index;
            }

            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className="w-8 h-8 p-0"
              >
                {pageNum}
              </Button>
            );
          })}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center space-x-1"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

/**
 * Main JobsList Component
 * Displays paginated job listings with loading and error states
 */
const JobsList = ({ jobs: propJobs }) => {
  // State management
  const [jobsData, setJobsData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 5;

  /**
   * Fetch jobs data from API
   */
  const fetchJobsData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiService.searchJobs({
        page: 1,
        limit: 50,
        days_old: 7
      });

      if (response && response.jobs) {
        setJobsData(response.jobs);
      } else {
        setJobsData([]);
      }
    } catch (error) {
      console.error('Failed to fetch jobs data:', error);
      setError(error.message || 'Failed to load jobs data');
      setJobsData([]);
    } finally {
      setIsLoading(false);
    }
  };


  // Apply filter when preparing currentJobs
const filteredJobs = jobsData.filter(job => job.posted_date !== null);

  /**
   * Calculate pagination values
   */
const totalJobs = filteredJobs.length;
const totalPages = Math.ceil(totalJobs / jobsPerPage);
const startIndex = (currentPage - 1) * jobsPerPage;
const endIndex = startIndex + jobsPerPage;
const currentJobs = filteredJobs.slice(startIndex, endIndex);

  /**
   * Handle page change
   */
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Smooth scroll to top of jobs list
      document.querySelector('[data-jobs-list]')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start' 
      });
    }
  };

  /**
   * Load data when component mounts or prop jobs change
   */
  useEffect(() => {
    if (propJobs && Array.isArray(propJobs)) {
      setJobsData(propJobs);
      setIsLoading(false);
    } else {
      fetchJobsData();
    }
  }, [propJobs]);

  /**
   * Reset to first page when jobs data changes
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [jobsData]);

  /**
   * Loading Skeleton Component
   */
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[...Array(jobsPerPage)].map((_, i) => (
        <Card key={i} className="h-full">
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <div className="flex items-center space-x-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {[...Array(4)].map((_, j) => (
                  <Skeleton key={j} className="h-6 w-16" />
                ))}
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          </CardContent>
        </Card>
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
          onClick={fetchJobsData}
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
      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-muted-foreground mb-2">
        No jobs found
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        No job listings are available at the moment. Check back later for new opportunities.
      </p>
      <Button 
        variant="outline" 
        onClick={fetchJobsData}
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh Jobs
      </Button>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
      data-jobs-list
    >
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5" />
                <span>Recent Jobs</span>
              </CardTitle>
              <CardDescription className="flex items-center space-x-2 mt-1">
                <Calendar className="h-4 w-4" />
                <span>Latest job opportunities from the market</span>
                {totalJobs > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {totalJobs} jobs
                  </Badge>
                )}
              </CardDescription>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchJobsData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Error State */}
          {error && <ErrorState />}
          
          {/* Loading State */}
          {isLoading && !error && <LoadingSkeleton />}
          
          {/* Empty State */}
          {!isLoading && !error && totalJobs === 0 && <EmptyState />}
          
          {/* Jobs Grid */}
          {!isLoading && !error && currentJobs.length > 0 && (
            <>
              <motion.div 
                layout
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <AnimatePresence mode="wait">
                  {currentJobs.map((job, index) => (
                    <JobCard
                      key={`${job.title}-${job.company}-${index}`}
                      job={job}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  jobsPerPage={jobsPerPage}
                  totalJobs={totalJobs}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default JobsList;
