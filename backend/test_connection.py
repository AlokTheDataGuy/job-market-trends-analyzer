#!/usr/bin/env python3
"""
Test script to verify database connection and basic functionality
"""
import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_environment():
    """Test environment variables"""
    print("🔧 Testing Environment Variables...")
    
    mongodb_uri = os.getenv('MONGODB_URI')
    if mongodb_uri:
        # Mask the password in the URI for display
        masked_uri = mongodb_uri.replace(mongodb_uri.split(':')[2].split('@')[0], '****')
        print(f"✅ MONGODB_URI found: {masked_uri}")
    else:
        print("❌ MONGODB_URI not found!")
        return False
    
    api_url = os.getenv('API_URL', 'http://localhost:8000')
    print(f"✅ API_URL: {api_url}")
    
    return True

def test_database_connection():
    """Test database connection"""
    print("\n💾 Testing Database Connection...")
    
    try:
        from database import get_database
        
        db_manager = get_database()
        stats = db_manager.get_stats()
        
        print(f"✅ Connected to MongoDB Atlas successfully!")
        print(f"📊 Current database stats:")
        print(f"   - Total jobs: {stats.get('total_jobs', 0):,}")
        print(f"   - Total skills: {stats.get('total_skills', 0):,}")
        print(f"   - Database size: {stats.get('db_size_mb', 0)} MB")
        
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_models():
    """Test Pydantic models"""
    print("\n📋 Testing Pydantic Models...")
    
    try:
        from models import JobRecord, ExtractedSkill, SalaryRange, SkillCategory
        from datetime import datetime
        
        # Test creating a sample job record
        skill = ExtractedSkill(
            skill="python",
            category=SkillCategory.programming
        )
        
        salary = SalaryRange(
            min_amount=50000,
            max_amount=80000,
            currency="INR"
        )
        
        job = JobRecord(
            job_hash="test123",
            title="Test Python Developer",
            company="Test Company",
            location="Test Location",
            description="Test job description with Python skills",
            skills_extracted=[skill],
            salary_range=salary,
            search_term="Python Developer",
            search_location="Bangalore",
            scraped_date=datetime.now()
        )
        
        print("✅ Pydantic models working correctly!")
        print(f"   - Created job: {job.title}")
        print(f"   - Skills extracted: {len(job.skills_extracted)}")
        print(f"   - Salary range: {job.salary_range.currency} {job.salary_range.min_amount}-{job.salary_range.max_amount}")
        
        return True
        
    except Exception as e:
        print(f"❌ Models test failed: {e}")
        return False

def test_scraper_initialization():
    """Test scraper initialization"""
    print("\n🔍 Testing Scraper Initialization...")
    
    try:
        # Import the updated scraper
        from scraper import JobScraper
        
        scraper = JobScraper()
        
        print("✅ JobScraper initialized successfully!")
        print(f"   - API URL: {scraper.api_url}")
        print(f"   - Skills categories: {len(scraper.TECH_SKILLS)}")
        print(f"   - Database connected: {scraper.db is not None}")
        
        return True
        
    except Exception as e:
        print(f"❌ Scraper initialization failed: {e}")
        import traceback
        print(f"   Details: {traceback.format_exc()}")
        return False

def main():
    """Run all tests"""
    print("🚀 Job Market Analyzer - Connection Test")
    print("=" * 50)
    
    tests = [
        ("Environment Variables", test_environment),
        ("Database Connection", test_database_connection),
        ("Pydantic Models", test_models),
        ("Scraper Initialization", test_scraper_initialization)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your system is ready to run.")
        print("\nNext steps:")
        print("1. Run: python scraper.py")
        print("2. Check your MongoDB Atlas dashboard")
        print("3. Monitor the job_scraper.log file")
    else:
        print("⚠️  Some tests failed. Please fix the issues before running the scraper.")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())