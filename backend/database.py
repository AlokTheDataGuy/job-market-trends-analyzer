# database.py
import os
import certifi
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.collection import Collection
from pymongo.database import Database
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class MongoDB:
    def __init__(self):
        self.client: Optional[MongoClient] = None
        self.db: Optional[Database] = None
        self.jobs: Optional[Collection] = None
        self.skills_trends: Optional[Collection] = None
        self.market_summary: Optional[Collection] = None
        
    def connect(self):
        """Connect to MongoDB Atlas"""
        try:
            mongo_uri = os.getenv('MONGODB_URI')
            if not mongo_uri:
                raise ValueError("MONGODB_URI environment variable not set")
            
            # ✅ Use certifi to fix SSL handshake failures
            self.client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
            self.db = self.client.job_trends
            
            # Initialize collections
            self.jobs = self.db.jobs
            self.skills_trends = self.db.skills_trends
            self.market_summary = self.db.market_summary
            
            # Test connection
            self.client.admin.command('ping')
            logger.info("✅ Connected to MongoDB Atlas")
            
            # Setup indexes
            self._create_indexes()
            
        except Exception as e:
            logger.error(f"❌ MongoDB connection failed: {e}")
            raise

    
    def _create_indexes(self):
        """Create database indexes for performance"""
        try:
            # Jobs collection indexes
            self.jobs.create_index([("job_hash", ASCENDING)], unique=True)
            self.jobs.create_index([("scraped_date", DESCENDING)])
            self.jobs.create_index([("search_term", ASCENDING)])
            self.jobs.create_index([("location", ASCENDING)])
            self.jobs.create_index([("company", ASCENDING)])
            self.jobs.create_index([("skills_extracted.skill", ASCENDING)])
            
            # Skills trends collection indexes
            self.skills_trends.create_index([("skill_name", ASCENDING)], unique=True)
            self.skills_trends.create_index([("category", ASCENDING)])
            self.skills_trends.create_index([("job_count_30d", DESCENDING)])
            
            # Market summary collection indexes
            self.market_summary.create_index([("date", DESCENDING)])
            
            logger.info("✅ Database indexes created")
            
        except Exception as e:
            logger.error(f"⚠️ Error creating indexes: {e}")
    
    def get_stats(self) -> dict:
        """Get database statistics"""
        try:
            stats = {
                'total_jobs': self.jobs.count_documents({}),
                'total_skills': self.skills_trends.count_documents({}),
                'db_size_mb': round(self.db.command("dbStats")['dataSize'] / (1024 * 1024), 2),
                'collections': {
                    'jobs': self.jobs.count_documents({}),
                    'skills_trends': self.skills_trends.count_documents({}),
                    'market_summary': self.market_summary.count_documents({})
                }
            }
            return stats
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {}
    
    def cleanup_old_data(self, days: int = 90) -> int:
        """Remove jobs older than specified days"""
        from datetime import datetime, timedelta
        cutoff_date = datetime.now() - timedelta(days=days)
        
        result = self.jobs.delete_many({"scraped_date": {"$lt": cutoff_date}})
        deleted_count = result.deleted_count
        
        logger.info(f"🗑️ Cleaned up {deleted_count} old job records")
        return deleted_count
    
    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")

# Global MongoDB instance
mongodb = MongoDB()

def get_database():
    """Get MongoDB database instance"""
    if mongodb.db is None:
        mongodb.connect()
    return mongodb