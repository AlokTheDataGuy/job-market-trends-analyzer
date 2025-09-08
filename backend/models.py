#models.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class SkillCategory(str, Enum):
    programming = "programming"
    frontend = "frontend"
    backend = "backend"
    databases = "databases"
    cloud = "cloud"
    mobile = "mobile"
    data = "data"
    tools = "tools"

class TrendDirection(str, Enum):
    up = "up"
    down = "down"
    stable = "stable"

class ExtractedSkill(BaseModel):
    skill: str
    category: SkillCategory

class SalaryRange(BaseModel):
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    currency: Optional[str] = None

class JobRecord(BaseModel):
    job_hash: str
    title: str
    company: str
    location: str
    description: str = Field(..., max_length=1000)
    job_url: Optional[str] = None
    skills_extracted: List[ExtractedSkill] = []
    salary_range: SalaryRange = SalaryRange()
    posted_date: Optional[str] = None
    site_source: Optional[str] = None
    search_term: str
    search_location: str
    scraped_date: datetime

class SkillTrend(BaseModel):
    skill_name: str
    category: SkillCategory
    job_count_30d: int
    job_count_7d: Optional[int] = 0
    growth_rate: Optional[float] = 0.0
    trend_direction: Optional[TrendDirection] = TrendDirection.stable
    companies_hiring: List[str] = []
    top_locations: List[str] = []
    avg_salary_min: Optional[float] = None
    avg_salary_max: Optional[float] = None
    last_updated: datetime

class MarketSummary(BaseModel):
    date: datetime
    total_jobs: int
    new_jobs_24h: int
    top_skills: List[Dict[str, Any]] = []
    top_companies: List[Dict[str, Any]] = []
    top_locations: List[Dict[str, Any]] = []
    skill_categories: Dict[str, int] = {}
    total_unique_skills: int

class JobSearchResponse(BaseModel):
    jobs: List[JobRecord]
    total_count: int
    page: int = 1
    limit: int = 50

class SkillTrendResponse(BaseModel):
    skills: List[SkillTrend]
    total_count: int
    category_filter: Optional[SkillCategory] = None

class TrendingSkillsQuery(BaseModel):
    category: Optional[SkillCategory] = None
    days: int = Field(default=30, ge=1, le=365)
    limit: int = Field(default=20, ge=1, le=100)
    sort_by: str = Field(default="job_count_30d", pattern="^(job_count_30d|growth_rate|skill_name)$")

class JobSearchQuery(BaseModel):
    search_term: Optional[str] = None
    location: Optional[str] = None
    company: Optional[str] = None
    skills: Optional[List[str]] = None
    days_old: int = Field(default=30, ge=1, le=365)
    limit: int = Field(default=50, ge=1, le=100)
    page: int = Field(default=1, ge=1)

class AnalyticsQuery(BaseModel):
    skill_name: Optional[str] = None
    location: Optional[str] = None
    days: int = Field(default=30, ge=7, le=365)
    group_by: str = Field(default="day", pattern="^(day|week|month)$")

class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    details: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)