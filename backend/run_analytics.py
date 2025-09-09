# run_analytics.py
import logging
from database import get_database
from analytics import JobAnalytics
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    try:
        # Use your existing database module
        db_manager = get_database()
        
        # Initialize analytics with your existing collections
        analytics = JobAnalytics(
            jobs_collection=db_manager.jobs,
            skills_collection=db_manager.skills_trends,
            market_collection=db_manager.db.market_summary
        )
        
        print("🚀 Starting skill trends calculation...")
        
        # Run multi-period analysis
        updated_count = analytics.calculate_skill_trends(days_periods=[7, 30, 60])
        print(f"✅ Updated {updated_count} skill trends")
        
        # Generate market summary
        print("📊 Generating market summary...")
        summary_success = analytics.generate_market_summary()
        
        if summary_success:
            print("✅ Market summary generated successfully")
        else:
            print("❌ Failed to generate market summary")
            
        print("🎉 Analytics update completed!")
        
    except Exception as e:
        logger.error(f"❌ Error running analytics: {e}")
        import traceback
        logger.error(traceback.format_exc())

if __name__ == "__main__":
    main()
