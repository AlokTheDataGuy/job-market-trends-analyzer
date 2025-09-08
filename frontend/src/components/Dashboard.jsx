// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Briefcase, 
  Target,
  Activity,
  AlertCircle,
  RefreshCw,
  Calendar,
  MapPin,
  Building
} from 'lucide-react';

// Import shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import API service and child components
import { apiService } from '@/services/api';
import TrendChart from './TrendChart';
import SkillsTable from './SkillsTable';
import JobsList from './JobsList';
import MarketSummaryCard from './MarketSummaryCard';

/**
 * MarketSummaryCard Component
 * Displays key market statistics and metrics
 */
<MarketSummaryCard />

/**
 * Main Dashboard Component
 * Orchestrates all dashboard sections and data fetching
 */
const Dashboard = () => {
  // State management for different data sections
  const [marketData, setMarketData] = useState(null);
  const [appStats, setAppStats] = useState(null);
  const [loading, setLoading] = useState({
    market: true,
    stats: true
  });
  const [errors, setErrors] = useState({
    market: null,
    stats: null
  });
  const [lastRefresh, setLastRefresh] = useState(new Date());

  /**
   * Load market summary data from API
   */
  const loadMarketData = async () => {
    try {
      setLoading(prev => ({ ...prev, market: true }));
      setErrors(prev => ({ ...prev, market: null }));
      
      const response = await apiService.getMarketSummary(7); // Last 7 days
      setMarketData(response);
    } catch (error) {
      console.error('Failed to load market data:', error);
      setErrors(prev => ({ ...prev, market: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, market: false }));
    }
  };

  /**
   * Load application statistics from API
   */
  const loadAppStats = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      setErrors(prev => ({ ...prev, stats: null }));
      
      const response = await apiService.getStats();
      setAppStats(response);
    } catch (error) {
      console.error('Failed to load app stats:', error);
      setErrors(prev => ({ ...prev, stats: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  /**
   * Refresh all dashboard data
   */
  const refreshAllData = async () => {
    setLastRefresh(new Date());
    await Promise.allSettled([
      loadMarketData(),
      loadAppStats()
    ]);
  };

  /**
   * Load initial data on component mount
   */
  useEffect(() => {
    refreshAllData();
  }, []);

  /**
   * Auto-refresh data every 5 minutes
   */
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAllData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Combine market data with app stats for MarketSummaryCard
  const combinedMarketData = marketData && appStats ? {
    ...marketData,
    top_skills: appStats.top_skills || []
  } : null;

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      <AnimatePresence>
        {(errors.market || errors.stats) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className="border-error-200 bg-error-50 dark:bg-error-900/10">
              <AlertCircle className="h-4 w-4 text-error-500" />
              <AlertDescription className="text-error-700 dark:text-error-400">
                {errors.market || errors.stats}
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={refreshAllData}
                  className="ml-2 text-error-600 hover:text-error-700"
                >
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard Grid Layout */}
      <div className="grid grid-cols-1 gap-6">
        {/* Market Summary - Full Width at Top */}
        <MarketSummaryCard 
          summary={combinedMarketData}
          isLoading={loading.market || loading.stats}
        />
        
        {/* Second Row - Trend Chart and Skills Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Trend Chart - 2/3 Width on Large Screens */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-8"
          >
            <TrendChart />
          </motion.div>
        
        {/* Skills Table - 1/3 Width on Large Screens */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-4"
          >
            <SkillsTable />
          </motion.div>
        </div>
      </div>

      {/* Jobs List - Full Width Below */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <JobsList />
      </motion.div>

      {/* Dashboard Footer Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-center text-sm text-muted-foreground"
      >
        <p>
          Dashboard last refreshed: {lastRefresh.toLocaleTimeString()}
          <Button 
            variant="link" 
            size="sm" 
            onClick={refreshAllData}
            className="ml-2 text-xs"
          >
            Refresh Now
          </Button>
        </p>
      </motion.div>
    </div>
  );
};

export default Dashboard;
