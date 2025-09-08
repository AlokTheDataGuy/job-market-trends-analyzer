# test_analytics.py
import sys
import logging
from database import get_database
from analytics import JobAnalytics

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_analytics():
    """Test analytics functions with existing data"""
    try:
        # Get database connection
        db = get_database()
        analytics = JobAnalytics(db.jobs, db.skills_trends, db.market_summary)
        
        logger.info("🧪 Testing Analytics Module")
        logger.info("=" * 50)
        
        # Test 1: Calculate skill trends
        logger.info("📊 Test 1: Calculating 30-day skill trends...")
        trends_updated = analytics.calculate_skill_trends(30)
        logger.info(f"✅ Updated {trends_updated} skill trends")
        
        # Test 2: Generate market summary
        logger.info("\n📈 Test 2: Generating market summary...")
        summary_created = analytics.generate_market_summary()
        if summary_created:
            logger.info("✅ Market summary generated successfully")
        
        # Test 3: Get trending skills
        logger.info("\n🔥 Test 3: Getting trending skills...")
        trending = analytics.get_trending_skills(limit=10)
        logger.info(f"Found {len(trending)} trending skills:")
        for i, skill in enumerate(trending[:5], 1):
            logger.info(f"   {i}. {skill['skill_name']} ({skill['category']}) - Growth: {skill.get('growth_rate', 0):.1f}%")
        
        # Test 4: Skill analytics for Python
        logger.info("\n🐍 Test 4: Python skill analytics...")
        python_analytics = analytics.get_skill_growth_analytics("python", 30)
        if python_analytics:
            logger.info(f"Python found in {python_analytics['total_jobs']} jobs over 30 days")
            logger.info(f"Top companies: {python_analytics['top_companies'][:3]}")
        
        # Test 5: Database aggregation performance
        logger.info("\n⚡ Test 5: Testing aggregation performance...")
        
        # Complex aggregation test
        pipeline = [
            {"$match": {"skills_extracted": {"$exists": True, "$ne": []}}},
            {"$unwind": "$skills_extracted"},
            {"$group": {
                "_id": "$skills_extracted.category",
                "unique_skills": {"$addToSet": "$skills_extracted.skill"},
                "total_jobs": {"$sum": 1},
                "companies": {"$addToSet": "$company"}
            }},
            {"$project": {
                "category": "$_id",
                "skill_count": {"$size": "$unique_skills"},
                "job_count": "$total_jobs",
                "company_count": {"$size": "$companies"}
            }},
            {"$sort": {"job_count": -1}}
        ]
        
        category_stats = list(db.jobs.aggregate(pipeline))
        logger.info("📋 Skills by category:")
        for cat in category_stats:
            logger.info(f"   {cat['category']}: {cat['skill_count']} skills, {cat['job_count']} jobs")
        
        # Test data validation
        logger.info("\n🔍 Test 6: Data validation...")
        total_jobs = db.jobs.count_documents({})
        jobs_with_skills = db.jobs.count_documents({"skills_extracted": {"$exists": True, "$ne": []}})
        jobs_without_skills = total_jobs - jobs_with_skills
        
        logger.info(f"Total jobs: {total_jobs}")
        logger.info(f"Jobs with skills: {jobs_with_skills} ({jobs_with_skills/total_jobs*100:.1f}%)")
        logger.info(f"Jobs without skills: {jobs_without_skills} ({jobs_without_skills/total_jobs*100:.1f}%)")
        
        # Test recent data
        from datetime import datetime, timedelta
        recent_cutoff = datetime.now() - timedelta(days=7)
        recent_jobs = db.jobs.count_documents({"scraped_date": {"$gte": recent_cutoff}})
        logger.info(f"Recent jobs (7 days): {recent_jobs}")
        
        logger.info("\n" + "=" * 50)
        logger.info("✅ All analytics tests completed successfully!")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Analytics test failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = test_analytics()
    sys.exit(0 if success else 1)