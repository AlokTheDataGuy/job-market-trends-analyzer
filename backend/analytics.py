# analytics.py - FIXED GROWTH RATE CALCULATION
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

    def calculate_skill_trends(self, days_periods: List[int] = [7, 30, 60]) -> int:
        """
        Calculate skill trends with CORRECTED growth rate calculation
        """
        current_time = datetime.now()
        
        try:
            # Debug: Check posted_date vs scraped_date distribution
            self._debug_job_posted_dates()
            
            # Calculate cutoff dates for each period
            period_cutoffs = {
                days: current_time - timedelta(days=days) 
                for days in days_periods
            }
            
            # Store aggregated data for each period
            period_results = {}
            
            # Run aggregation pipeline for each time period using posted_date
            for period_days, cutoff_date in period_cutoffs.items():
                
                # Use posted_date for more accurate market trends
                date_query = {
                    "$or": [
                        # Handle posted_date as datetime
                        {"posted_date": {"$gte": cutoff_date}},
                        # Handle posted_date as string (YYYY-MM-DD)
                        {"posted_date": {"$gte": cutoff_date.strftime("%Y-%m-%d")}},
                        # Fallback to scraped_date if posted_date is null/missing
                        {
                            "posted_date": {"$in": [None, ""]},
                            "scraped_date": {"$gte": cutoff_date}
                        }
                    ]
                }
                
                # Count total jobs in this period first (for debugging)
                total_jobs_in_period = self.jobs.count_documents(date_query)
                logger.info(f"📊 Jobs posted in last {period_days}d: {total_jobs_in_period}")
                
                pipeline = [
                    # Filter jobs within the time period using posted_date
                    {"$match": date_query},
                    
                    # Unwind skills array to process each skill separately
                    {"$unwind": "$skills_extracted"},
                    
                    # Group by skill and category, collect additional data
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
                    
                    # Sort by job count descending
                    {"$sort": {"job_count": -1}}
                ]
                
                # Execute aggregation and store results
                results = list(self.jobs.aggregate(pipeline))
                period_results[period_days] = {
                    (result['_id']['skill'], result['_id']['category']): result 
                    for result in results
                }
                
                logger.info(f"📊 Found {len(results)} unique skills in {period_days}d period")
            
            # Process all unique skill-category combinations across all periods
            all_skill_keys = set()
            for period_data in period_results.values():
                all_skill_keys.update(period_data.keys())
            
            updated_count = 0
            
            for skill_key in all_skill_keys:
                skill_name, category = skill_key
                
                # Extract job counts for each period (default to 0 if not found)
                job_counts = {}
                latest_data = None
                
                for period_days in sorted(days_periods):
                    if skill_key in period_results[period_days]:
                        job_counts[period_days] = period_results[period_days][skill_key]['job_count']
                        if latest_data is None:  # Use data from shortest period (most recent)
                            latest_data = period_results[period_days][skill_key]
                    else:
                        job_counts[period_days] = 0

                # **🔥 FIXED GROWTH CALCULATION**
                growth_rates = {}
                
                # Calculate proper growth rates using standard formula: ((new - old) / old) * 100
                if len(days_periods) >= 2:
                    
                    # Growth: Recent 7 days vs Previous 7-30 days period
                    if 7 in job_counts and 30 in job_counts:
                        recent_7d = job_counts[7]
                        jobs_8_to_30d = job_counts[30] - job_counts[7]  # Jobs from day 8-30 (23 days)
                        
                        # Calculate daily averages
                        daily_recent = recent_7d / 7
                        daily_older = jobs_8_to_30d / 23 if jobs_8_to_30d > 0 else 0.01
                        
                        # Standard growth formula
                        growth_7d_vs_older = ((daily_recent - daily_older) / daily_older) * 100
                        growth_rates['7d_vs_23d'] = round(growth_7d_vs_older, 2)
                    
                    # Growth: 30 days vs Previous 30-60 days period  
                    if 30 in job_counts and 60 in job_counts:
                        jobs_1_to_30d = job_counts[30]
                        jobs_31_to_60d = job_counts[60] - job_counts[30]  # Jobs from day 31-60 (30 days)
                        
                        # Calculate daily averages
                        daily_recent = jobs_1_to_30d / 30
                        daily_older = jobs_31_to_60d / 30 if jobs_31_to_60d > 0 else 0.01
                        
                        # Standard growth formula
                        growth_30d_vs_older = ((daily_recent - daily_older) / daily_older) * 100
                        growth_rates['30d_vs_30d'] = round(growth_30d_vs_older, 2)

                # **🔥 FIXED OVERALL GROWTH RATE CALCULATION**
                # Use weighted average, giving more weight to recent trends
                if growth_rates:
                    # Filter extreme outliers (beyond ±500%)
                    filtered_rates = [rate for rate in growth_rates.values() if abs(rate) <= 500]
                    
                    if filtered_rates:
                        # Calculate weighted average (more weight to recent trends)
                        if len(filtered_rates) >= 2:
                            # Give 70% weight to recent trend, 30% to medium-term
                            weights = [0.7, 0.3]
                            avg_growth_rate = sum(rate * weight for rate, weight in zip(filtered_rates[:2], weights))
                        else:
                            avg_growth_rate = filtered_rates[0]
                    else:
                        # All rates were extreme outliers, use a capped value
                        avg_growth_rate = min(max(list(growth_rates.values())[0], -200), 200)
                else:
                    avg_growth_rate = 0.0

                # Determine trend direction based on actual growth and activity
                trend_direction = self._determine_trend_direction_fixed(avg_growth_rate, job_counts)
                
                # Process salary data
                avg_salary_min = None
                avg_salary_max = None
                
                if latest_data and latest_data.get('salaries'):
                    valid_salaries = [s for s in latest_data['salaries'] if s is not None]
                    if valid_salaries:
                        avg_salary_min = round(sum(s['min'] for s in valid_salaries) / len(valid_salaries), 2)
                        avg_salary_max = round(sum(s['max'] for s in valid_salaries) / len(valid_salaries), 2)
                
                # Prepare skill trend document for database update
                skill_trend_doc = {
                    'skill_name': skill_name,
                    'category': category,
                    'job_count_7d': job_counts.get(7, 0),
                    'job_count_30d': job_counts.get(30, 0),
                    'job_count_60d': job_counts.get(60, 0),
                    'growth_rate': round(avg_growth_rate, 2),  # 🔥 NOW CALCULATED CORRECTLY
                    'growth_rates_detail': growth_rates,
                    'trend_direction': trend_direction,
                    'companies_hiring': latest_data.get('companies', [])[:15] if latest_data else [],
                    'top_locations': latest_data.get('locations', [])[:10] if latest_data else [],
                    'avg_salary_min': avg_salary_min,
                    'avg_salary_max': avg_salary_max,
                    'last_updated': current_time,
                    'period_days': max(days_periods)
                }
                
                # Update or insert skill trend in database
                self.skills.update_one(
                    {'skill_name': skill_name, 'category': category},
                    {'$set': skill_trend_doc},
                    upsert=True
                )
                
                updated_count += 1
                
                # Log progress for monitoring
                if updated_count % 20 == 0:
                    logger.info(f"📈 Processed {updated_count} skills...")
            
            logger.info(f"✅ Successfully updated {updated_count} skill trends based on job posting dates")
            return updated_count
            
        except Exception as e:
            logger.error(f"❌ Error in calculate_skill_trends: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return 0

    def _determine_trend_direction_fixed(self, avg_growth_rate: float, job_counts: Dict[int, int]) -> TrendDirection:
        """
        Determine trend direction based on growth rate and activity levels
        """
        try:
            recent_activity = job_counts.get(7, 0)
            
            # Strong upward trend: high growth + decent activity
            if avg_growth_rate > 50 and recent_activity >= 5:
                return TrendDirection.up
            
            # Moderate upward trend
            elif avg_growth_rate > 20 and recent_activity >= 2:
                return TrendDirection.up
            
            # Any positive growth with recent activity
            elif avg_growth_rate > 5 and recent_activity >= 1:
                return TrendDirection.up
            
            # Downward trend: negative growth or very low activity
            elif avg_growth_rate < -20 or recent_activity == 0:
                return TrendDirection.down
            
            # Default to stable
            else:
                return TrendDirection.stable
                
        except Exception as e:
            logger.error(f"Error determining trend direction: {e}")
            return TrendDirection.stable

    def _debug_job_posted_dates(self):
        """Debug method to check job posting date distribution"""
        try:
            # Check posted_date format and range
            sample_jobs = list(self.jobs.find({}, {'posted_date': 1, 'scraped_date': 1}).limit(10))
            
            if sample_jobs:
                logger.info("📅 Sample job dates:")
                for job in sample_jobs[:5]:
                    posted = job.get('posted_date', 'None')
                    scraped = job.get('scraped_date', 'None')
                    logger.info(f"  Posted: {posted}, Scraped: {scraped}")
                
                # Check if we have valid posted_date values
                valid_posted_dates = self.jobs.count_documents({"posted_date": {"$ne": None, "$exists": True}})
                total_jobs = self.jobs.count_documents({})
                logger.info(f"📊 Jobs with valid posted_date: {valid_posted_dates}/{total_jobs}")
                
                if valid_posted_dates > 0:
                    # Get posted date range
                    oldest_posted = list(self.jobs.find(
                        {"posted_date": {"$ne": None}}, 
                        {'posted_date': 1}
                    ).sort('posted_date', 1).limit(1))
                    
                    newest_posted = list(self.jobs.find(
                        {"posted_date": {"$ne": None}}, 
                        {'posted_date': 1}
                    ).sort('posted_date', -1).limit(1))
                    
                    if oldest_posted and newest_posted:
                        logger.info(f"📅 Posted date range: {oldest_posted[0]['posted_date']} to {newest_posted[0]['posted_date']}")
                        
        except Exception as e:
            logger.warning(f"⚠️ Could not debug posted dates: {e}")


    def generate_market_summary(self) -> bool:
        """Generate comprehensive daily market summary with enhanced metrics"""
        try:
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            yesterday = today - timedelta(days=1)
            week_ago = today - timedelta(days=7)
            
            # Calculate total and recent job counts
            total_jobs = self.jobs.count_documents({})
            new_jobs_24h = self.jobs.count_documents({"scraped_date": {"$gte": yesterday}})
            jobs_last_7d = self.jobs.count_documents({"scraped_date": {"$gte": week_ago}})
            
            # Top skills aggregation (last 7 days with better formatting)
            skills_pipeline = [
                {"$match": {"scraped_date": {"$gte": week_ago}}},
                {"$unwind": "$skills_extracted"},
                {"$group": {
                    "_id": "$skills_extracted.skill",
                    "count": {"$sum": 1},
                    "category": {"$first": "$skills_extracted.category"}
                }},
                {"$sort": {"count": -1}},
                {"$limit": 15}
            ]
            
            top_skills = [
                {
                    "skill": s['_id'], 
                    "count": s['count'],
                    "category": s.get('category', 'other')
                } 
                for s in self.jobs.aggregate(skills_pipeline)
            ]
            
            # Top companies with job counts
            companies_pipeline = [
                {"$match": {"scraped_date": {"$gte": week_ago}}},
                {"$group": {"_id": "$company", "job_count": {"$sum": 1}}},
                {"$sort": {"job_count": -1}},
                {"$limit": 15}
            ]
            
            top_companies = [
                {"company": c['_id'], "job_count": c['job_count']} 
                for c in self.jobs.aggregate(companies_pipeline)
            ]
            
            # Top locations with job counts
            locations_pipeline = [
                {"$match": {"scraped_date": {"$gte": week_ago}}},
                {"$group": {"_id": "$location", "job_count": {"$sum": 1}}},
                {"$sort": {"job_count": -1}},
                {"$limit": 15}
            ]
            
            top_locations = [
                {"location": l['_id'], "job_count": l['job_count']} 
                for l in self.jobs.aggregate(locations_pipeline)
            ]
            
            # Enhanced skill categories breakdown
            categories_pipeline = [
                {"$match": {"scraped_date": {"$gte": week_ago}}},
                {"$unwind": "$skills_extracted"},
                {"$group": {"_id": "$skills_extracted.category", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            
            skill_categories = {
                cat['_id']: cat['count'] 
                for cat in self.jobs.aggregate(categories_pipeline)
            }
            
            # Calculate unique metrics
            total_unique_skills = self.skills.count_documents({})
            total_companies = len(self.jobs.distinct("company", {"scraped_date": {"$gte": week_ago}}))
            total_locations = len(self.jobs.distinct("location", {"scraped_date": {"$gte": week_ago}}))
            
            # Create comprehensive market summary
            summary = MarketSummary(
                date=today,
                total_jobs=total_jobs,
                new_jobs_24h=new_jobs_24h,
                jobs_last_7d=jobs_last_7d,
                top_skills=top_skills,
                top_companies=top_companies,
                top_locations=top_locations,
                skill_categories=skill_categories,
                total_unique_skills=total_unique_skills,
                total_companies=total_companies,
                total_locations=total_locations
            )
            
            # Store in market collection
            self.market.update_one(
                {'date': today},
                {'$set': summary.model_dump()},
                upsert=True
            )
            
            logger.info(f"✅ Market summary generated: {total_jobs} total jobs, {new_jobs_24h} new (24h), {jobs_last_7d} weekly")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error generating market summary: {str(e)}")
            return False


    def get_skill_growth_analytics(self, skill_name: str, days: int = 30) -> Dict:
        """Enhanced skill growth analytics with daily timeline"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Generate complete date range
            date_range = []
            current = start_date
            while current <= end_date:
                date_range.append(current.strftime("%Y-%m-%d"))
                current += timedelta(days=1)
            
            # Aggregate daily job postings for the specific skill
            daily_pipeline = [
                {"$match": {
                    "scraped_date": {"$gte": start_date, "$lte": end_date},
                    "skills_extracted.skill": {"$regex": f"^{skill_name}$", "$options": "i"}
                }},
                {"$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$scraped_date"}
                    },
                    "job_count": {"$sum": 1},
                    "companies": {"$addToSet": "$company"},
                    "avg_salary": {"$avg": {
                        "$cond": [
                            {"$ne": ["$salary_range.min_amount", None]},
                            "$salary_range.min_amount",
                            None
                        ]
                    }}
                }},
                {"$sort": {"_id": 1}}
            ]
            
            daily_data = list(self.jobs.aggregate(daily_pipeline))
            daily_dict = {d["_id"]: d for d in daily_data}
            
            # Create complete timeline with missing dates filled as 0
            timeline = []
            total_jobs = 0
            
            for date_str in date_range:
                day_data = daily_dict.get(date_str, {})
                count = day_data.get("job_count", 0)
                total_jobs += count
                
                timeline.append({
                    "date": date_str,
                    "count": count,
                    "companies_count": len(day_data.get("companies", [])),
                    "avg_salary": day_data.get("avg_salary")
                })
            
            # Calculate trend metrics
            recent_week = sum(d["count"] for d in timeline[-7:])
            previous_week = sum(d["count"] for d in timeline[-14:-7]) if len(timeline) >= 14 else 0
            
            weekly_growth = ((recent_week - previous_week) / previous_week * 100) if previous_week > 0 else 0
            
            return {
                "skill": skill_name,
                "period_days": days,
                "timeline": timeline,
                "total_jobs": total_jobs,
                "recent_week_jobs": recent_week,
                "weekly_growth_rate": round(weekly_growth, 2),
                "avg_daily_jobs": round(total_jobs / days, 2)
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting analytics for {skill_name}: {str(e)}")
            return {
                "skill": skill_name,
                "period_days": days,
                "timeline": [],
                "total_jobs": 0,
                "error": str(e)
            }

    def get_trending_skills(self, category: Optional[SkillCategory] = None, limit: int = 20) -> List[Dict]:
        """Get trending skills with enhanced filtering and sorting"""
        try:
            # Build match criteria
            match_filter = {"growth_rate": {"$exists": True}}
            if category:
                match_filter["category"] = category
            
            # Enhanced aggregation pipeline
            pipeline = [
                {"$match": match_filter},
                {"$addFields": {
                    "momentum_score": {
                        "$add": [
                            {"$multiply": ["$growth_rate", 0.7]},  # Weight growth rate
                            {"$multiply": ["$job_count_7d", 0.3]}  # Weight recent activity
                        ]
                    }
                }},
                {"$sort": {"momentum_score": -1, "job_count_30d": -1}},
                {"$limit": limit},
                {"$project": {
                    "skill_name": 1,
                    "category": 1,
                    "job_count_7d": 1,
                    "job_count_30d": 1,
                    "growth_rate": 1,
                    "trend_direction": 1,
                    "companies_hiring": 1,
                    "momentum_score": 1
                }}
            ]
            
            trending = list(self.skills.aggregate(pipeline))
            
            logger.info(f"📈 Found {len(trending)} trending skills" + (f" in {category}" if category else ""))
            return trending
            
        except Exception as e:
            logger.error(f"❌ Error getting trending skills: {str(e)}")
            return []
