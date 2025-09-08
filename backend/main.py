# main.py

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from typing import List, Optional
import logging
from database import get_database
from models import (
    JobSearchQuery, TrendingSkillsQuery, AnalyticsQuery,
    JobSearchResponse, SkillTrendResponse, APIResponse, ErrorResponse,
    SkillCategory, TrendDirection
)

app = FastAPI(
    title="Job Market Trends API",
    description="API for job market analysis and skill trends",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)

def get_db():
    return get_database()

@app.get("/", response_model=APIResponse)
async def root():
    return APIResponse(success=True, message="Job Market Trends API is running")

@app.get("/health")
async def health_check():
    try:
        db = get_db()
        stats = db.get_stats()
        return {"status": "healthy", "database": "connected", "stats": stats}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

@app.post("/api/jobs/search", response_model=JobSearchResponse)
async def search_jobs(query: JobSearchQuery, db=Depends(get_db)):
    try:
        filter_criteria = {"scraped_date": {"$gte": datetime.now() - timedelta(days=query.days_old)}}
        
        if query.search_term:
            filter_criteria["$text"] = {"$search": query.search_term}
        if query.location:
            filter_criteria["location"] = {"$regex": query.location, "$options": "i"}
        if query.company:
            filter_criteria["company"] = {"$regex": query.company, "$options": "i"}
        if query.skills:
            filter_criteria["skills_extracted.skill"] = {"$in": [s.lower() for s in query.skills]}

        skip = (query.page - 1) * query.limit
        
        jobs_cursor = db.jobs.find(filter_criteria).skip(skip).limit(query.limit).sort("scraped_date", -1)
        jobs = list(jobs_cursor)
        total_count = db.jobs.count_documents(filter_criteria)
        
        for job in jobs:
            job["_id"] = str(job["_id"])
        
        return JobSearchResponse(
            jobs=jobs,
            total_count=total_count,
            page=query.page,
            limit=query.limit
        )
    except Exception as e:
        logger.error(f"Job search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/skills/trending", response_model=SkillTrendResponse)
async def get_trending_skills(
    category: Optional[SkillCategory] = None,
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("job_count_30d", pattern="^(job_count_30d|growth_rate|skill_name)$"),
    db=Depends(get_db)
):
    try:
        filter_criteria = {}
        if category:
            filter_criteria["category"] = category
        
        sort_direction = -1 if sort_by != "skill_name" else 1
        
        skills_cursor = db.skills_trends.find(filter_criteria).sort(sort_by, sort_direction).limit(limit)
        skills = list(skills_cursor)
        total_count = db.skills_trends.count_documents(filter_criteria)
        
        for skill in skills:
            skill["_id"] = str(skill["_id"])
        
        return SkillTrendResponse(
            skills=skills,
            total_count=total_count,
            category_filter=category
        )
    except Exception as e:
        logger.error(f"Trending skills error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/skill/{skill_name}")
async def get_skill_analytics(skill_name: str, days: int = Query(30, ge=7, le=365), db=Depends(get_db)):
    try:
        from analytics import JobAnalytics
        analytics = JobAnalytics(db.jobs, db.skills_trends, db.market_summary)
        data = analytics.get_skill_growth_analytics(skill_name, days)
        
        if data is None:
            raise HTTPException(status_code=404, detail=f"No data found for skill: {skill_name}")
            
        return APIResponse(success=True, message=f"Analytics for {skill_name}", data=data)
        
    except Exception as e:
        logger.error(f"Skill analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/market/summary")
async def get_market_summary(days: int = Query(7, ge=1, le=30), db=Depends(get_db)):
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        
        summary = db.market_summary.find_one(
            {"date": {"$gte": cutoff_date}},
            sort=[("date", -1)]
        )
        
        if not summary:
            return APIResponse(success=False, message="No market summary available")
        
        summary["_id"] = str(summary["_id"])
        return APIResponse(success=True, message="Market summary retrieved", data=summary)
    except Exception as e:
        logger.error(f"Market summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
async def get_database_stats(db=Depends(get_db)):
    try:
        stats = db.get_stats()
        
        recent_jobs = db.jobs.count_documents({
            "scraped_date": {"$gte": datetime.now() - timedelta(days=7)}
        })
        
        top_skills_pipeline = [
            {"$match": {"scraped_date": {"$gte": datetime.now() - timedelta(days=30)}}},
            {"$unwind": "$skills_extracted"},
            {"$group": {"_id": "$skills_extracted.skill", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        
        top_skills = list(db.jobs.aggregate(top_skills_pipeline))
        
        enhanced_stats = {
            **stats,
            "recent_jobs_7d": recent_jobs,
            "top_skills": top_skills,
            "api_version": "1.0.0",
            "last_updated": datetime.now().isoformat()
        }
        
        return APIResponse(success=True, message="Database statistics", data=enhanced_stats)
    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/skills/categories")
async def get_skill_categories(db=Depends(get_db)):
    try:
        pipeline = [
            {"$unwind": "$skills_extracted"},
            {"$group": {
                "_id": "$skills_extracted.category",
                "skill_count": {"$sum": 1},
                "unique_skills": {"$addToSet": "$skills_extracted.skill"}
            }},
            {"$project": {
                "category": "$_id",
                "job_count": "$skill_count",
                "unique_skills_count": {"$size": "$unique_skills"}
            }},
            {"$sort": {"job_count": -1}}
        ]
        
        categories = list(db.jobs.aggregate(pipeline))
        
        return APIResponse(
            success=True, 
            message="Skill categories breakdown", 
            data={"categories": categories, "total_categories": len(categories)}
        )
    except Exception as e:
        logger.error(f"Categories error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(error=exc.detail).dict()
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(error="Internal server error", details=str(exc)).dict()
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)