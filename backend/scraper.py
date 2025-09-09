#scraper.py
import requests
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import hashlib
import re
import logging
from dotenv import load_dotenv
import os

# Import your existing modules
from database import get_database
from models import JobRecord, ExtractedSkill, SalaryRange, SkillCategory
from skill_extractor import EnhancedSkillExtractor
from data_validator import DataValidator
from analytics import JobAnalytics

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('job_scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class JobScraper:
    def __init__(self):
        """Initialize the job scraper with your existing database module"""
        # API Configuration
        self.api_url = os.getenv('API_URL', 'http://localhost:8000')
        self.api_key = os.getenv('API_KEY', 'my-secret-key-123')
        self.headers = {"x-api-key": self.api_key, "Content-Type": "application/json"}
        
        # Get database instance using your existing module
        self.db_manager = get_database()
        self.db = self.db_manager.db
        
        # Collections from your database module
        self.jobs_collection = self.db_manager.jobs
        self.skills_collection = self.db_manager.skills_trends
        self.metrics_collection = self.db.scraping_metrics
        
        # Enhanced Skill Extractor
        self.skill_extractor = EnhancedSkillExtractor()
        
        # Data Validator
        self.validator = DataValidator()
        
        # Job Analytics
        self.analytics = JobAnalytics(self.jobs_collection, self.skills_collection, self.db.market_summary)


    def generate_job_hash(self, job: Dict) -> str:
        """Generate unique hash for job deduplication"""
        company = (job.get('company') or '').lower().strip()
        title = (job.get('title') or '').lower().strip()
        location = (job.get('location') or 'Unknown').lower().strip()
        
        
        key_string = f"{company}-{title}-{location}"
        return hashlib.md5(key_string.encode()).hexdigest()

    def extract_skills(self, description: str, title: str = "", requirements: str = "") -> List[ExtractedSkill]:
        return self.skill_extractor.extract_skills_enhanced(description, title, requirements)

    def create_job_record(self, job: Dict, search_term: str, search_location: str) -> Optional[JobRecord]:
        """Create a JobRecord using your Pydantic model"""
        try:
            # Generate unique hash
            job_hash = self.generate_job_hash(job)
            
            # Extract skills
            skills_extracted = self.extract_skills(
                job.get('description', ''), 
                job.get('title', ''), 
                job.get('requirements', '')
            )
            
            # Create salary range
            salary_range = SalaryRange(
                min_amount=job.get('min_amount'),
                max_amount=job.get('max_amount'),
                currency=job.get('currency', 'INR')
            )
            
            # Create job record using your model
            job_record = JobRecord(
                job_hash=job_hash,
                title=str(job.get('title', '')).strip(),
                company=str(job.get('company', '')).strip(),
                location=str(job.get('location' or 'Unknown')).strip(),
                description=str(job.get('description') or job.get('title') or 'No description provided')[:1000],
                job_url=job.get('job_url'),
                skills_extracted=skills_extracted,
                salary_range=salary_range,
                posted_date=job.get('date_posted'),
                site_source=job.get('site'),
                search_term=search_term,
                search_location=search_location,
                scraped_date=datetime.now()
            )
            
            return job_record
            
        except Exception as e:
            logger.error(f"Error creating JobRecord: {e}")
            return None

    def search_and_store_jobs(self, search_terms: List[str], locations: List[str]) -> Dict:
        """Search for jobs and store using your database module"""
        metrics = {
            'start_time': datetime.now(),
            'total_searched': 0,
            'total_stored': 0,
            'duplicates_found': 0,
            'errors': 0,
            'search_details': []
        }
        
        for search_term in search_terms:
            for location in locations:
                search_start = datetime.now()
                logger.info(f"🔍 Searching '{search_term}' in {location}...")
                
                params = {
                    "search_term": search_term,
                    "location": location,
                    "site_name": ["naukri", "indeed", "linkedin"],
                    "results_wanted": 50,
                    "country_indeed": "India",
                    "job_type": "fulltime",
                    "format": "json"
                }
                
                search_metrics = {
                    'search_term': search_term,
                    'location': location,
                    'start_time': search_start,
                    'jobs_found': 0,
                    'jobs_stored': 0,
                    'duplicates': 0,
                    'error': None
                }
                
                try:
                    response = requests.get(
                        f"{self.api_url}/api/v1/search_jobs",
                        headers=self.headers,
                        params=params,
                        timeout=60
                    )
                    
                    if response.status_code == 200:
                        jobs_data = response.json()
                        if isinstance(jobs_data, list):
                            jobs = jobs_data
                        elif isinstance(jobs_data, dict) and 'jobs' in jobs_data:
                            jobs = jobs_data['jobs']  # API might wrap jobs in a 'jobs' key
                        else:
                            jobs = [jobs_data] if jobs_data else []

                        search_metrics['jobs_found'] = len(jobs)

                        for job in jobs:
                            if isinstance(job, dict) and job.get('title') and job.get('title').strip():
                                result = self.store_job(job, search_term, location)
                                if result == 'stored':
                                    search_metrics['jobs_stored'] += 1
                                elif result == 'duplicate':
                                    search_metrics['duplicates'] += 1
                        
                        logger.info(f"✅ {search_term} in {location}: {search_metrics['jobs_stored']} new, {search_metrics['duplicates']} duplicates")
                        
                    else:
                        error_msg = f"API returned status {response.status_code}"
                        search_metrics['error'] = error_msg
                        logger.warning(f"⚠️ {error_msg}")
                        metrics['errors'] += 1
                    
                except Exception as e:
                    error_msg = str(e)
                    search_metrics['error'] = error_msg
                    logger.error(f"❌ Error for {search_term} in {location}: {e}")
                    metrics['errors'] += 1
                
                search_metrics['duration'] = (datetime.now() - search_start).total_seconds()
                metrics['search_details'].append(search_metrics)
                metrics['total_searched'] += search_metrics['jobs_found']
                metrics['total_stored'] += search_metrics['jobs_stored']
                metrics['duplicates_found'] += search_metrics['duplicates']
                
                time.sleep(2)  # Rate limiting
        
        metrics['end_time'] = datetime.now()
        metrics['total_duration'] = (metrics['end_time'] - metrics['start_time']).total_seconds()
        
        # Store metrics
        self.store_scraping_metrics(metrics)
        
        return metrics

    def store_job(self, job: Dict, search_term: str, search_location: str) -> str:
        """Store job using your database module and models"""
        try:
            # Create JobRecord using your model
            job_record = self.create_job_record(job, search_term, search_location)
            if not job_record:
                return 'error'
            
            # Check if job already exists
            existing = self.jobs_collection.find_one({'job_hash': job_record.job_hash})
            if existing:
                return 'duplicate'
            
            # Convert Pydantic model to dict for MongoDB insertion
            job_dict = job_record.model_dump()
            
            # Convert ExtractedSkill objects to dicts
            job_dict['skills_extracted'] = [
                skill.model_dump() for skill in job_record.skills_extracted
            ]
            
            is_valid, errors = self.validator.validate_job_record(job_dict)
            if not is_valid:
                logger.warning(f"Invalid job record: {errors}")
                return 'invalid'
            
            # Insert the job
            result = self.jobs_collection.insert_one(job_dict)
            
            if result.inserted_id:
                return 'stored'
            else:
                return 'error'
            
        except Exception as e:
            logger.error(f"⚠️ Error storing job: {e}")
            return 'error'

    def store_scraping_metrics(self, metrics: Dict):
        """Store scraping session metrics"""
        try:
            self.metrics_collection.insert_one(metrics)
            logger.info("📊 Scraping metrics saved")
        except Exception as e:
            logger.error(f"❌ Error saving metrics: {e}")

    def update_skill_trends(self):
        logger.info("📊 Updating skill trends...")
        trends_updated = self.analytics.calculate_skill_trends(30)
        self.analytics.generate_market_summary()
        return trends_updated

    def get_comprehensive_stats(self):
        """Get comprehensive statistics using your database module"""
        try:
            # Use your existing database stats method
            db_stats = self.db_manager.get_stats()
            
            # Additional custom stats
            recent_jobs = self.jobs_collection.count_documents({
                "scraped_date": {"$gte": datetime.now() - timedelta(days=7)}
            })
            
            # Top companies
            company_pipeline = [
                {"$group": {"_id": "$company", "job_count": {"$sum": 1}}},
                {"$sort": {"job_count": -1}},
                {"$limit": 5}
            ]
            top_companies = list(self.jobs_collection.aggregate(company_pipeline))
            
            # Top locations
            location_pipeline = [
                {"$group": {"_id": "$location", "job_count": {"$sum": 1}}},
                {"$sort": {"job_count": -1}},
                {"$limit": 5}
            ]
            top_locations = list(self.jobs_collection.aggregate(location_pipeline))
            
            # Print formatted stats
            logger.info("=" * 60)
            logger.info("📊 COMPREHENSIVE DATABASE STATISTICS")
            logger.info("=" * 60)
            logger.info(f"📋 Total jobs: {db_stats.get('total_jobs', 0):,}")
            logger.info(f"📅 Recent jobs (7d): {recent_jobs:,}")
            logger.info(f"🔧 Skills tracked: {db_stats.get('total_skills', 0):,}")
            logger.info(f"💾 Database size: {db_stats.get('db_size_mb', 0)} MB")
            
            logger.info("\n🏢 Top 5 Companies:")
            for i, company in enumerate(top_companies, 1):
                logger.info(f"   {i}. {company['_id']}: {company['job_count']} jobs")
            
            logger.info("\n📍 Top 5 Locations:")
            for i, location in enumerate(top_locations, 1):
                logger.info(f"   {i}. {location['_id']}: {location['job_count']} jobs")
            
            return {**db_stats, 'recent_jobs': recent_jobs}
            
        except Exception as e:
            logger.error(f"❌ Error getting comprehensive stats: {e}")
            return {}

    def validate_and_cleanup_data(self, cleanup: bool = False):
        """Run data validation and optional cleanup"""
        logger.info("🔍 Running data validation...")
        validation_results = self.validator.validate_database_integrity()
        
        logger.info(f"Data quality score: {validation_results['data_quality_score']:.2%}")
        logger.info(f"Invalid jobs: {validation_results['invalid_jobs']}")
        
        if cleanup and validation_results['data_quality_score'] < 0.8:
            logger.info("🧹 Running cleanup...")
            cleanup_stats = self.validator.cleanup_invalid_records(dry_run=False)
            logger.info(f"Removed {cleanup_stats['total_removed']} invalid records")
        
        return validation_results

    def cleanup_old_data(self, days: int = 90):
        """Use your database module's cleanup method"""
        try:
            deleted_count = self.db_manager.cleanup_old_data(days)
            
            # Also cleanup metrics
            cutoff_date = datetime.now() - timedelta(days=days)
            metrics_result = self.metrics_collection.delete_many(
                {"start_time": {"$lt": cutoff_date}}
            )
            logger.info(f"🗑️ Cleaned up {metrics_result.deleted_count} old metric records")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"❌ Error during cleanup: {e}")
            return 0

def main():
    """Main execution function"""
    # Configuration
    SEARCH_TERMS = [
        # "Python Developer",
        # "Java Developer", 
        # "Full Stack Developer",
        "React Developer",
        "Node.js Developer",
        # "Data Scientist",
        # "DevOps Engineer"
    ]
    
    LOCATIONS = [
        # "Bangalore, India",
        # "Mumbai, India", 
        # "Delhi, India",
        # "Pune, India",
        "Hyderabad, India",
        "Chennai, India"
    ]
    
    try:
        logger.info("🚀 Starting Job Scraping System")
        logger.info("=" * 60)
        
        # Initialize scraper
        scraper = JobScraper()
        
        # Test database connection
        db_stats = scraper.db_manager.get_stats()
        logger.info(f"✅ Connected to database with {db_stats.get('total_jobs', 0)} existing jobs")
        
        logger.info("🔍 Starting job search and storage process...")
        
        # Search and store jobs
        metrics = scraper.search_and_store_jobs(SEARCH_TERMS, LOCATIONS)
        
        # Log session summary
        logger.info("=" * 60)
        logger.info("📈 SESSION SUMMARY")
        logger.info("=" * 60)
        logger.info(f"⏱️  Total duration: {metrics['total_duration']:.1f} seconds")
        logger.info(f"🔍 Jobs searched: {metrics['total_searched']}")
        logger.info(f"💾 Jobs stored: {metrics['total_stored']}")
        logger.info(f"🔄 Duplicates found: {metrics['duplicates_found']}")
        logger.info(f"❌ Errors encountered: {metrics['errors']}")
        
        if metrics['total_stored'] > 0:
            # Update skill trends
            logger.info("📊 Updating skill trends...")
            scraper.update_skill_trends()
            
            # Validate & Cleanup Data
            validation_results = scraper.validate_and_cleanup_data(cleanup=True)
            if validation_results.get('data_quality_score', 0) < 0.5:
                logger.warning("Low data quality detected, consider manual review")
            
            # Clean old data
            logger.info("🧹 Cleaning up old data...")
            scraper.cleanup_old_data(180)
        
        # Show comprehensive stats
        scraper.get_comprehensive_stats()
        
        logger.info("=" * 60)
        logger.info("✅ Job scraping session completed successfully!")
        logger.info("=" * 60)
        
        return 0
        
    except Exception as e:
        logger.error(f"❌ Critical error in main execution: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return 1

if __name__ == "__main__":
    exit(main())