# analytics.py
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pymongo.collection import Collection
from models import SkillTrend, MarketSummary, TrendDirection, SkillCategory

logger = logging.getLogger(__name__)

class JobAnalytics:
    def __init__(self, jobs_collection: Collection, skills_collection: Collection, market_collection: Collection):
        self.jobs = jobs_collection
        self.skills = skills_collection
        self.market = market_collection

    def calculate_skill_trends(self, days: int = 30) -> int:
        """Calculate skill trends with growth rates and trend directions"""
        cutoff_date = datetime.now() - timedelta(days=days)
        prev_period = datetime.now() - timedelta(days=days*2)
        
        try:
            # Current period skills aggregation
            current_pipeline = [
                {"$match": {"scraped_date": {"$gte": cutoff_date}}},
                {"$unwind": "$skills_extracted"},
                {"$group": {
                    "_id": {
                        "skill": "$skills_extracted.skill",
                        "category": "$skills_extracted.category"
                    },
                    "job_count": {"$sum": 1},
                    "companies": {"$addToSet": "$company"},
                    "locations": {"$addToSet": "$location"},
                    "salaries": {"$push": {
                        "$cond": [
                            {"$and": [
                                {"$ne": ["$salary_range.min_amount", None]},
                                {"$ne": ["$salary_range.max_amount", None]}
                            ]},
                            {"min": "$salary_range.min_amount", "max": "$salary_range.max_amount"},
                            None
                        ]
                    }}
                }},
                {"$sort": {"job_count": -1}}
            ]
            
            # Previous period for growth calculation
            prev_pipeline = [
                {"$match": {"scraped_date": {"$gte": prev_period, "$lt": cutoff_date}}},
                {"$unwind": "$skills_extracted"},
                {"$group": {
                    "_id": {
                        "skill": "$skills_extracted.skill",
                        "category": "$skills_extracted.category"
                    },
                    "prev_job_count": {"$sum": 1}
                }}
            ]
            
            current_trends = list(self.jobs.aggregate(current_pipeline))
            prev_trends = {f"{t['_id']['skill']}_{t['_id']['category']}": t['prev_job_count'] 
                          for t in self.jobs.aggregate(prev_pipeline)}
            
            updated_count = 0
            
            for trend in current_trends:
                skill_name = trend['_id']['skill']
                category = trend['_id']['category']
                key = f"{skill_name}_{category}"
                
                # Calculate growth rate
                current_count = trend['job_count']
                prev_count = prev_trends.get(key, 0)
                growth_rate = ((current_count - prev_count) / prev_count * 100) if prev_count > 0 else 100.0
                
                # Determine trend direction
                if growth_rate > 10:
                    trend_direction = TrendDirection.up
                elif growth_rate < -10:
                    trend_direction = TrendDirection.down
                else:
                    trend_direction = TrendDirection.stable
                
                # Calculate average salary
                valid_salaries = [s for s in trend['salaries'] if s is not None]
                avg_min = sum(s['min'] for s in valid_salaries) / len(valid_salaries) if valid_salaries else None
                avg_max = sum(s['max'] for s in valid_salaries) / len(valid_salaries) if valid_salaries else None
                
                # Update skill trend document
                skill_trend = {
                    'skill_name': skill_name,
                    'category': category,
                    f'job_count_{days}d': current_count,
                    'growth_rate': round(growth_rate, 2),
                    'trend_direction': trend_direction,
                    'companies_hiring': trend['companies'][:15],
                    'top_locations': trend['locations'][:10],
                    'avg_salary_min': avg_min,
                    'avg_salary_max': avg_max,
                    'last_updated': datetime.now()
                }
                
                self.skills.update_one(
                    {'skill_name': skill_name, 'category': category},
                    {'$set': skill_trend},
                    upsert=True
                )
                updated_count += 1
            
            logger.info(f"✅ Updated {updated_count} skill trends for {days}d period")
            return updated_count
            
        except Exception as e:
            logger.error(f"❌ Error calculating skill trends: {e}")
            return 0

    def generate_market_summary(self) -> bool:
        """Generate daily market summary"""
        try:
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            yesterday = today - timedelta(days=1)
            week_ago = today - timedelta(days=7)
            
            # Total jobs count
            total_jobs = self.jobs.count_documents({})
            new_jobs_24h = self.jobs.count_documents({"scraped_date": {"$gte": yesterday}})
            
            # Top skills (last 7 days)
            skills_pipeline = [
                {"$match": {"scraped_date": {"$gte": week_ago}}},
                {"$unwind": "$skills_extracted"},
                {"$group": {"_id": "$skills_extracted.skill", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ]
            top_skills = [{"skill": s['_id'], "count": s['count']} 
                         for s in self.jobs.aggregate(skills_pipeline)]
            
            # Top companies
            companies_pipeline = [
                {"$match": {"scraped_date": {"$gte": week_ago}}},
                {"$group": {"_id": "$company", "job_count": {"$sum": 1}}},
                {"$sort": {"job_count": -1}},
                {"$limit": 10}
            ]
            top_companies = [{"company": c['_id'], "job_count": c['job_count']} 
                            for c in self.jobs.aggregate(companies_pipeline)]
            
            # Top locations
            locations_pipeline = [
                {"$match": {"scraped_date": {"$gte": week_ago}}},
                {"$group": {"_id": "$location", "job_count": {"$sum": 1}}},
                {"$sort": {"job_count": -1}},
                {"$limit": 10}
            ]
            top_locations = [{"location": l['_id'], "job_count": l['job_count']} 
                            for l in self.jobs.aggregate(locations_pipeline)]
            
            # Skill categories breakdown
            categories_pipeline = [
                {"$match": {"scraped_date": {"$gte": week_ago}}},
                {"$unwind": "$skills_extracted"},
                {"$group": {"_id": "$skills_extracted.category", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            skill_categories = {cat['_id']: cat['count'] 
                              for cat in self.jobs.aggregate(categories_pipeline)}
            
            # Total unique skills
            total_unique_skills = self.skills.count_documents({})
            
            # Create market summary
            summary = MarketSummary(
                date=today,
                total_jobs=total_jobs,
                new_jobs_24h=new_jobs_24h,
                top_skills=top_skills,
                top_companies=top_companies,
                top_locations=top_locations,
                skill_categories=skill_categories,
                total_unique_skills=total_unique_skills
            )
            
            # Store summary
            self.market.update_one(
                {'date': today},
                {'$set': summary.model_dump()},
                upsert=True
            )
            
            logger.info(f"✅ Generated market summary: {total_jobs} total jobs, {new_jobs_24h} new jobs")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error generating market summary: {e}")
            return False

    def get_skill_growth_analytics(self, skill_name: str, days: int = 30) -> Dict:
        """Get detailed analytics for specific skill"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            # Daily job postings for the skill
            daily_pipeline = [
                {"$match": {
                    "scraped_date": {"$gte": cutoff_date},
                    "skills_extracted.skill": skill_name
                }},
                {"$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$scraped_date"}
                    },
                    "job_count": {"$sum": 1}
                }},
                {"$sort": {"_id": 1}}
            ]
            
            daily_data = list(self.jobs.aggregate(daily_pipeline))
            
            # Company distribution
            company_pipeline = [
                {"$match": {
                    "scraped_date": {"$gte": cutoff_date},
                    "skills_extracted.skill": skill_name
                }},
                {"$group": {"_id": "$company", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ]
            
            companies = list(self.jobs.aggregate(company_pipeline))
            
            # Location distribution
            location_pipeline = [
                {"$match": {
                    "scraped_date": {"$gte": cutoff_date},
                    "skills_extracted.skill": skill_name
                }},
                {"$group": {"_id": "$location", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ]
            
            locations = list(self.jobs.aggregate(location_pipeline))
            
            total_jobs = sum(d['job_count'] for d in daily_data)
            if total_jobs == 0:
                return None
            
            return {
                "skill": skill_name,
                "period_days": days,
                "daily_trend": daily_data,
                "top_companies": companies,
                "top_locations": locations,
                "total_jobs": total_jobs
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting skill analytics for {skill_name}: {e}")
            return {}

    def get_trending_skills(self, category: Optional[SkillCategory] = None, limit: int = 20) -> List[Dict]:
        """Get trending skills with fastest growth"""
        try:
            match_filter = {"growth_rate": {"$exists": True}}
            if category:
                match_filter["category"] = category
            
            pipeline = [
                {"$match": match_filter},
                {"$sort": {"growth_rate": -1, "job_count_30d": -1}},
                {"$limit": limit}
            ]
            
            trending = list(self.skills.aggregate(pipeline))
            return trending
            
        except Exception as e:
            logger.error(f"❌ Error getting trending skills: {e}")
            return []