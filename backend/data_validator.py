# data_validator.py - Comprehensive data validation
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
from database import get_database
from models import JobRecord

logger = logging.getLogger(__name__)

class DataValidator:
    def __init__(self):
        self.db = get_database()
        self.validation_rules = {
            'title': {'min_length': 2, 'max_length': 200, 'required': True},
            'company': {'min_length': 2, 'max_length': 100, 'required': True},
            'skills_extracted': {'min_count': 0, 'max_count': 50, 'required': False}
        }

    def validate_job_record(self, job_dict: Dict) -> Tuple[bool, List[str]]:
        """Validate individual job record against rules"""
        errors = []
        
        # Check required fields
        for field, rules in self.validation_rules.items():
            if rules['required'] and (field not in job_dict or not job_dict[field]):
                errors.append(f"Missing required field: {field}")
                continue
            
            if field in job_dict and job_dict[field]:
                value = job_dict[field]
                
                # String length validation
                if isinstance(value, str):
                    if len(value.strip()) < rules['min_length']:
                        errors.append(f"{field} too short (min: {rules['min_length']})")
                    if len(value) > rules['max_length']:
                        errors.append(f"{field} too long (max: {rules['max_length']})")
                
                # List count validation  
                elif isinstance(value, list):
                    if 'min_count' in rules and len(value) < rules['min_count']:
                        errors.append(f"{field} count too low (min: {rules['min_count']})")
                    if 'max_count' in rules and len(value) > rules['max_count']:
                        errors.append(f"{field} count too high (max: {rules['max_count']})")
        
        # Validate job_hash uniqueness (if not checking during insert)
        if 'job_hash' in job_dict:
            existing = self.db.jobs.find_one({'job_hash': job_dict['job_hash']})
            if existing:
                errors.append("Duplicate job_hash found")
        
        # Validate scraped_date is recent
        if 'scraped_date' in job_dict:
            if isinstance(job_dict['scraped_date'], datetime):
                days_old = (datetime.now() - job_dict['scraped_date']).days
                if days_old > 30:
                    errors.append(f"Job record too old: {days_old} days")
        
        return len(errors) == 0, errors

    def validate_database_integrity(self) -> Dict:
        """Run comprehensive database validation checks"""
        results = {
            'total_jobs': 0,
            'valid_jobs': 0,
            'invalid_jobs': 0,
            'duplicate_hashes': 0,
            'missing_skills': 0,
            'old_records': 0,
            'validation_errors': [],
            'data_quality_score': 0.0
        }
        
        try:
            # Count total jobs
            results['total_jobs'] = self.db.jobs.count_documents({})
            
            # Check for duplicate job_hashes
            pipeline = [
                {"$group": {"_id": "$job_hash", "count": {"$sum": 1}}},
                {"$match": {"count": {"$gt": 1}}}
            ]
            duplicates = list(self.db.jobs.aggregate(pipeline))
            results['duplicate_hashes'] = len(duplicates)
            
            # Count jobs without skills
            results['missing_skills'] = self.db.jobs.count_documents({
                "$or": [
                    {"skills_extracted": {"$exists": False}},
                    {"skills_extracted": {"$size": 0}}
                ]
            })
            
            # Count old records (>30 days)
            cutoff_date = datetime.now() - timedelta(days=30)
            results['old_records'] = self.db.jobs.count_documents({
                "scraped_date": {"$lt": cutoff_date}
            })
            
            # Sample validation of recent records
            recent_jobs = list(self.db.jobs.find(
                {"scraped_date": {"$gte": cutoff_date}},
                limit=100
            ))
            
            valid_count = 0
            for job in recent_jobs:
                is_valid, errors = self.validate_job_record(job)
                if is_valid:
                    valid_count += 1
                else:
                    results['validation_errors'].extend(errors)
            
            results['valid_jobs'] = valid_count
            results['invalid_jobs'] = len(recent_jobs) - valid_count
            
            # Calculate data quality score
            if results['total_jobs'] > 0:
                quality_factors = [
                    1 - (results['duplicate_hashes'] / results['total_jobs']),
                    1 - (results['missing_skills'] / results['total_jobs']),
                    1 - (results['old_records'] / results['total_jobs']),
                    (valid_count / len(recent_jobs)) if recent_jobs else 1.0
                ]
                results['data_quality_score'] = sum(quality_factors) / len(quality_factors)
            
            logger.info(f"✅ Database validation completed: {results['data_quality_score']:.2%} quality score")
            
        except Exception as e:
            logger.error(f"❌ Database validation failed: {e}")
            results['validation_errors'].append(f"Validation error: {str(e)}")
        
        return results

    def cleanup_invalid_records(self, dry_run: bool = True) -> Dict:
        """Clean up invalid records (dry_run=False to actually delete)"""
        cleanup_stats = {
            'duplicates_removed': 0,
            'old_records_removed': 0,
            'invalid_records_removed': 0,
            'total_removed': 0
        }
        
        try:
            # Remove duplicate job_hashes (keep newest)
            pipeline = [
                {"$group": {
                    "_id": "$job_hash",
                    "docs": {"$push": {"id": "$_id", "date": "$scraped_date"}},
                    "count": {"$sum": 1}
                }},
                {"$match": {"count": {"$gt": 1}}}
            ]
            
            duplicates = list(self.db.jobs.aggregate(pipeline))
            for dup in duplicates:
                # Sort by date and remove all but the newest
                sorted_docs = sorted(dup['docs'], key=lambda x: x['date'], reverse=True)
                to_remove = [doc['id'] for doc in sorted_docs[1:]]  # All except first (newest)
                
                if not dry_run:
                    result = self.db.jobs.delete_many({"_id": {"$in": to_remove}})
                    cleanup_stats['duplicates_removed'] += result.deleted_count
                else:
                    cleanup_stats['duplicates_removed'] += len(to_remove)
            
            # Remove very old records (>90 days)
            old_cutoff = datetime.now() - timedelta(days=90)
            if not dry_run:
                result = self.db.jobs.delete_many({"scraped_date": {"$lt": old_cutoff}})
                cleanup_stats['old_records_removed'] = result.deleted_count
            else:
                cleanup_stats['old_records_removed'] = self.db.jobs.count_documents({
                    "scraped_date": {"$lt": old_cutoff}
                })
            
            cleanup_stats['total_removed'] = (
                cleanup_stats['duplicates_removed'] + 
                cleanup_stats['old_records_removed'] + 
                cleanup_stats['invalid_records_removed']
            )
            
            action = "Would remove" if dry_run else "Removed"
            logger.info(f"🧹 {action} {cleanup_stats['total_removed']} invalid records")
            
        except Exception as e:
            logger.error(f"❌ Cleanup failed: {e}")
        
        return cleanup_stats