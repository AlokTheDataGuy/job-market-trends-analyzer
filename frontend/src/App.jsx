// src/App.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Search, 
  Moon, 
  Sun, 
  Menu, 
  X,
  Activity,
  Database,
  Users,
  Calendar
} from 'lucide-react';

// Import shadcn/ui components
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Import custom components (we'll create these next)
import Dashboard from '@/components/Dashboard';

// Import API service
import { apiService } from '@/services/api';

/**
 * Main App Component
 * Handles theme switching, responsive layout, and component orchestration
 */
function App() {
  // State management for theme and mobile menu
  const [darkMode, setDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appStats, setAppStats] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Initialize app data and theme on component mount
   */
  useEffect(() => {
    // Check for saved theme preference or default to system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // Load initial app statistics
    loadAppStats();
  }, []);

  /**
   * Load application statistics from API
   */
  const loadAppStats = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getStats();
      setAppStats(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load app stats:', err);
      setError('Failed to load application data');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Toggle dark mode theme
   */
  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  /**
   * Toggle mobile navigation menu
   */
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  /**
   * Navigation Bar Component
   */
  const Navbar = () => (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo and Title */}
          <motion.div 
            className="flex items-center space-x-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex-shrink-0 flex items-center">
              <div className="bg-primary-500 p-2 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gradient">
                Job Market Skill Trend Analyzer
              </h1>
              <p className="text-xs text-muted-foreground">
                Real-time job market insights
              </p>
            </div>
            <div className="block sm:hidden">
              <h1 className="text-lg font-bold text-gradient">
                Job Analyzer
              </h1>
            </div>
          </motion.div>

          {/* Desktop Navigation Items */}
          <div className="hidden md:flex items-center space-x-4">
            {/* App Statistics */}
            {appStats && (
              <motion.div 
                className="flex items-center space-x-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>Live Data</span>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {appStats.recent_jobs_7d}+ jobs
                </Badge>
                <Badge variant="outline" className="text-xs">
                  v{appStats.api_version}
                </Badge>
              </motion.div>
            )}

            {/* Theme Toggle */}
<div className="flex items-center space-x-4">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Switch 
                checked={darkMode}
                onCheckedChange={toggleTheme}
                className="data-[state=checked]:bg-primary-500"
              />
              <Moon className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Action Button */}
            {/* <Button 
              variant="default"
              size="sm"
              className="bg-primary-500 hover:bg-primary-600"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Dashboard
            </Button> */}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="p-2"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-border mt-2 pt-4 pb-4"
            >
              <div className="flex flex-col space-y-4">
                {/* Mobile Stats */}
                {appStats && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Database className="h-4 w-4" />
                      <span>{appStats.recent_jobs_7d}+ recent jobs</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      v{appStats.api_version}
                    </Badge>
                  </div>
                )}

                {/* Mobile Theme Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Dark Mode</span>
                  <div className="flex items-center space-x-2">
                    <Sun className="h-4 w-4 text-muted-foreground" />
                    <Switch 
                      checked={darkMode}
                      onCheckedChange={toggleTheme}
                    />
                    <Moon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Mobile Action Button */}
                <Button 
                  variant="default"
                  size="sm"
                  className="w-full bg-primary-500 hover:bg-primary-600"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );

  /**
   * Loading State Component
   */
  const LoadingState = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-4 w-3/4 mb-4" />
            <Skeleton className="h-8 w-1/2 mb-2" />
            <Skeleton className="h-3 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );

  /**
   * Error State Component
   */
  const ErrorState = () => (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-error-50 dark:bg-error-900/20 p-4 rounded-lg mb-6">
          <X className="h-8 w-8 text-error-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-error-700 dark:text-error-400 mb-2">
            Unable to Load Data
          </h3>
          <p className="text-error-600 dark:text-error-300 mb-4">
            {error}
          </p>
          <Button 
            onClick={loadAppStats}
            variant="outline"
            className="border-error-500 text-error-500 hover:bg-error-50"
          >
            Try Again
          </Button>
        </div>
      </motion.div>
    </div>
  );

  /**
   * Main App Layout Component
   */
  const MainLayout = () => (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gradient mb-4">
              Data-Driven Job Market Insights
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Analyze trending skills, track market demands, and discover opportunities 
              in the evolving job landscape powered by real-time data.
            </p>
            
            {/* Quick Stats Cards */}
            {appStats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-3xl mx-auto"
              >
                <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Recent Jobs (7d)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary-600">
                      {appStats.recent_jobs_7d.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Top Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-2">
                      {appStats.top_skills?.length || 0}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Last Updated
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-medium text-muted-foreground flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(appStats.last_updated).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Main Dashboard Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="space-y-8"
      >
        {/* Dashboard Component - This now includes MarketSummaryCard */}
        <Dashboard />
      </motion.div>
    </section>
  </main>
);


  // Main App Render
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Bar */}
      <Navbar />
      {/* Main Content with Conditional Rendering */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoadingState />
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ErrorState />
          </motion.div>
        ) : (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MainLayout />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-secondary-50 dark:bg-secondary-900/20 border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Built with React, FastAPI, and ❤️ for data-driven career insights
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              © 2025 Job Market Skill Trend Analyzer. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
