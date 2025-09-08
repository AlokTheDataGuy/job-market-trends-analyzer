#!/usr/bin/env python3
"""
JobSpy API Script for Indian Software Jobs
Searches for software development jobs in India using the JobSpy Docker API
FIXED VERSION - Resolves Indeed API parameter conflicts
"""

import requests
import json
import csv
import time
from datetime import datetime
from typing import List, Dict, Optional
import os

class IndianSoftwareJobSearcher:
    def __init__(self, api_url: str = "http://localhost:8000", api_key: str = None):
        """
        Initialize the job searcher
        
        Args:
            api_url: JobSpy API base URL
            api_key: Your custom API key for authentication
        """
        self.api_url = api_url
        self.api_key ="my-secret-key-123"  # Replace with your actual API key
        self.headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        
    def check_api_health(self) -> bool:
        """Check if the API is running and healthy"""
        try:
            response = requests.get(f"{self.api_url}/health", timeout=10)
            if response.status_code == 200:
                print("✅ API is healthy and running")
                return True
            else:
                print(f"❌ API health check failed: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"❌ Cannot connect to API: {e}")
            return False

    def search_software_jobs(
        self,
        search_terms: List[str],
        locations: List[str],
        job_sites: List[str] = None,
        results_per_site: int = 50,
        search_mode: str = "job_type"  # "job_type" or "recent"
    ) -> List[Dict]:
        """
        Search for software jobs in India
        
        Args:
            search_terms: List of job search terms
            locations: List of Indian cities to search in
            job_sites: List of job sites to search (default: indian-friendly sites)
            results_per_site: Number of results per site
            search_mode: "job_type" for full-time jobs, "recent" for jobs from last week
            
        Returns:
            List of job dictionaries
        """
        if job_sites is None:
            # Focus on sites that work well in India
            job_sites = ["naukri", "indeed", "google", "linkedin"]
        
        all_jobs = []
        
        for search_term in search_terms:
            for location in locations:
                print(f"\n🔍 Searching for '{search_term}' in {location}...")
                
                # Base parameters that work for all sites
                params = {
                    "search_term": search_term,
                    "location": location,
                    "site_name": job_sites,
                    "results_wanted": results_per_site,
                    "country_indeed": "India",  # Set Indeed to India
                    "description_format": "markdown",
                    "format": "json",
                    "verbose": 1  # Reduce verbosity
                }
                
                # Add filtering parameters based on search mode
                # Indeed only allows ONE of these parameter groups at a time
                if search_mode == "recent":
                    params["hours_old"] = 168  # Last week
                    print(f"  📅 Searching for jobs posted in last week")
                elif search_mode == "job_type":
                    params["job_type"] = "fulltime"
                    print(f"  💼 Searching for full-time positions")
                
                try:
                    response = requests.get(
                        f"{self.api_url}/api/v1/search_jobs",
                        headers=self.headers,
                        params=params,
                        timeout=60
                    )
                    
                    if response.status_code == 200:
                        try:
                            response_data = response.json()
                            
                            # Handle different response formats
                            if isinstance(response_data, list):
                                jobs = response_data
                            elif isinstance(response_data, dict):
                                # Sometimes the response might be wrapped in a dict
                                jobs = response_data.get('jobs', response_data.get('data', [response_data]))
                            else:
                                print(f"⚠️  Unexpected response format: {type(response_data)}")
                                continue
                            
                            if jobs:
                                # Filter out any non-dict items and add metadata
                                valid_jobs = []
                                for job in jobs:
                                    if isinstance(job, dict):
                                        job['search_term'] = search_term
                                        job['search_location'] = location
                                        job['search_timestamp'] = datetime.now().isoformat()
                                        job['search_mode'] = search_mode
                                        valid_jobs.append(job)
                                    else:
                                        print(f"⚠️  Skipping invalid job data: {type(job)} - {str(job)[:100]}...")
                                
                                if valid_jobs:
                                    print(f"✅ Found {len(valid_jobs)} valid jobs for '{search_term}' in {location}")
                                    all_jobs.extend(valid_jobs)
                                else:
                                    print(f"⚠️  No valid job dictionaries found for '{search_term}' in {location}")
                            else:
                                print(f"⚠️  No jobs found for '{search_term}' in {location}")
                                
                        except json.JSONDecodeError as e:
                            print(f"❌ Failed to parse JSON response: {e}")
                            print(f"   Raw response: {response.text[:200]}...")
                        except Exception as e:
                            print(f"❌ Error processing response: {e}")
                            print(f"   Response type: {type(response_data)}")
                            if hasattr(response_data, '__len__') and len(str(response_data)) < 500:
                                print(f"   Response data: {response_data}")
                    
                    elif response.status_code == 429:
                        print("⏸️  Rate limit hit. Waiting 60 seconds...")
                        time.sleep(60)
                        continue
                        
                    elif response.status_code == 401:
                        print("❌ Authentication failed. Check your API key.")
                        break
                        
                    elif response.status_code == 400:
                        print(f"⚠️  Bad request for '{search_term}' in {location}")
                        print(f"    Response: {response.text}")
                        
                    else:
                        print(f"❌ API error {response.status_code}: {response.text}")
                
                except requests.exceptions.Timeout:
                    print(f"⏰ Request timed out for '{search_term}' in {location}")
                    
                except requests.exceptions.RequestException as e:
                    print(f"❌ Request failed: {e}")
                
                # Small delay between requests to be respectful
                time.sleep(2)
        
        return all_jobs

    def filter_indian_software_jobs(self, jobs: List[Dict]) -> List[Dict]:
        """
        Filter and enhance job listings for Indian software roles
        """
        indian_tech_keywords = [
            'python', 'java', 'javascript', 'react', 'angular', 'node.js', 'django',
            'spring', 'hibernate', 'mysql', 'postgresql', 'mongodb', 'aws', 'azure',
            'docker', 'kubernetes', 'microservices', 'api', 'rest', 'devops',
            'full stack', 'frontend', 'backend', 'mobile', 'android', 'ios',
            'machine learning', 'data science', 'ai', 'blockchain', 'fintech'
        ]
        
        indian_cities = [
            'bangalore', 'mumbai', 'delhi', 'hyderabad', 'chennai', 'pune',
            'kolkata', 'gurgaon', 'noida', 'kochi', 'indore', 'jaipur'
        ]
        
        filtered_jobs = []
        
        for job in jobs:
            # Safely get string fields, handling None values
            title = (job.get('title') or '').lower()
            description = (job.get('description') or '').lower()
            location = (job.get('location') or '').lower()
            company = (job.get('company') or '').lower()
            
            # Skip jobs with completely empty essential fields
            if not title and not description:
                continue
            
            # Check if it's a software job
            is_software_job = any(keyword in title or keyword in description 
                                for keyword in indian_tech_keywords)
            
            # Check if it's in India (location check)
            is_indian_location = any(city in location for city in indian_cities) or 'india' in location
            
            if is_software_job and is_indian_location:
                # Add salary estimation for Indian market
                job['estimated_inr_salary'] = self._estimate_inr_salary(
                    job.get('min_amount'), 
                    job.get('max_amount')
                )
                filtered_jobs.append(job)
        
        return filtered_jobs
    
    def _estimate_inr_salary(self, min_amount: float, max_amount: float) -> str:
        """Estimate INR salary if USD salary is provided"""
        if not min_amount and not max_amount:
            return "Not specified"
        
        usd_to_inr = 83  # Approximate exchange rate
        
        if min_amount and max_amount:
            min_inr = int(min_amount * usd_to_inr)
            max_inr = int(max_amount * usd_to_inr)
            return f"₹{min_inr:,} - ₹{max_inr:,} per year"
        elif min_amount:
            min_inr = int(min_amount * usd_to_inr)
            return f"₹{min_inr:,}+ per year"
        elif max_amount:
            max_inr = int(max_amount * usd_to_inr)
            return f"Up to ₹{max_inr:,} per year"
        
        return "Not specified"

    def save_jobs_to_csv(self, jobs: List[Dict], filename: str = None) -> str:
        """Save jobs to CSV file"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"indian_software_jobs_{timestamp}.csv"
        
        if not jobs:
            print("⚠️  No jobs to save")
            return filename
        
        # Define CSV columns
        fieldnames = [
            'title', 'company', 'location', 'job_url', 'description',
            'min_amount', 'max_amount', 'estimated_inr_salary', 'currency',
            'date_posted', 'site', 'job_type', 'search_term', 'search_location', 'search_mode'
        ]
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for job in jobs:
                # Create a clean row with only the fields we want
                row = {field: job.get(field, '') for field in fieldnames}
                writer.writerow(row)
        
        print(f"💾 Saved {len(jobs)} jobs to {filename}")
        return filename

    def print_job_summary(self, jobs: List[Dict]):
        """Print a summary of found jobs"""
        if not jobs:
            print("❌ No jobs found")
            return
        
        print(f"\n📊 SUMMARY: Found {len(jobs)} Indian software jobs")
        print("=" * 60)
        
        # Group by company
        companies = {}
        locations = {}
        sites = {}
        
        for job in jobs:
            company = job.get('company', 'Unknown')
            location = job.get('location', 'Unknown')
            site = job.get('site', 'Unknown')
            
            companies[company] = companies.get(company, 0) + 1
            locations[location] = locations.get(location, 0) + 1
            sites[site] = sites.get(site, 0) + 1
        
        print(f"\n🏢 Top Companies:")
        for company, count in sorted(companies.items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"  {company}: {count} jobs")
        
        print(f"\n📍 Top Locations:")
        for location, count in sorted(locations.items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"  {location}: {count} jobs")
        
        print(f"\n🌐 Job Sites:")
        for site, count in sorted(sites.items(), key=lambda x: x[1], reverse=True):
            print(f"  {site}: {count} jobs")

def main():
    """Main function to run the job search"""
    
    # Configuration
    API_URL = "http://localhost:8000"
    API_KEY = "my-secret-key-123"  # Replace with your actual API key
    
    # Job search parameters for Indian software jobs
    SEARCH_TERMS = [
        "Python Developer"
        # "Java Developer", 
        # "Full Stack Developer",
        # "React Developer",
        # "Node.js Developer",
        # "DevOps Engineer",
        # "Data Scientist",
        # "Machine Learning Engineer",
        # "Software Engineer",
        # "Backend Developer",
        # "Frontend Developer",
        # "Mobile Developer"
    ]
    
    INDIAN_CITIES = [
        "Bangalore, India",
        # "Mumbai, India", 
        # "Delhi, India",
        # "Hyderabad, India",
        # "Chennai, India",
        # "Pune, India",
        # "Gurgaon, India",
        # "Noida, India"
    ]
    
    # Initialize the job searcher
    job_searcher = IndianSoftwareJobSearcher(API_URL, API_KEY)
    
    # Check API health
    if not job_searcher.check_api_health():
        print("❌ Please make sure the JobSpy API is running:")
        print("   docker run -p 8000:8000 -e API_KEYS=your-secret-api-key rainmanjam/jobspy-api:latest")
        return
    
    print("🚀 Starting Indian Software Jobs Search...")
    print(f"🔍 Search terms: {', '.join(SEARCH_TERMS[:3])}... (+{len(SEARCH_TERMS)-3} more)")
    print(f"📍 Cities: {', '.join([city.split(',')[0] for city in INDIAN_CITIES[:4]])}... (+{len(INDIAN_CITIES)-4} more)")
    
    # Search for jobs with job type filtering (recommended)
    print(f"\n💼 Using job type filtering (full-time positions)")
    all_jobs = job_searcher.search_software_jobs(
        search_terms=SEARCH_TERMS,
        locations=INDIAN_CITIES,
        job_sites=["naukri", "indeed", "google", "linkedin"],  # Best sites for India
        results_per_site=30,
        search_mode="job_type"  # Use job type filtering to avoid parameter conflicts
    )
    
    # Alternative: Search for recent jobs instead
    # Uncomment these lines and comment the above if you prefer recent jobs over job type filtering
    # print(f"\n📅 Using time-based filtering (jobs from last week)")
    # all_jobs = job_searcher.search_software_jobs(
    #     search_terms=SEARCH_TERMS,
    #     locations=INDIAN_CITIES,
    #     job_sites=["naukri", "indeed", "google", "linkedin"],
    #     results_per_site=30,
    #     search_mode="recent"
    # )
    
    if all_jobs:
        # Filter for relevant Indian software jobs
        filtered_jobs = job_searcher.filter_indian_software_jobs(all_jobs)
        
        # Print summary
        job_searcher.print_job_summary(filtered_jobs)
        
        # Save to CSV
        csv_filename = job_searcher.save_jobs_to_csv(filtered_jobs)
        
        # Print some sample jobs
        print(f"\n📋 Sample Jobs (showing first 5):")
        print("=" * 80)
        
        for i, job in enumerate(filtered_jobs[:5]):
            print(f"\n{i+1}. {job.get('title', 'N/A')}")
            print(f"   🏢 Company: {job.get('company', 'N/A')}")
            print(f"   📍 Location: {job.get('location', 'N/A')}")
            print(f"   💰 Salary: {job.get('estimated_inr_salary', 'Not specified')}")
            print(f"   🌐 Site: {job.get('site', 'N/A')}")
            print(f"   🔗 URL: {job.get('job_url', 'N/A')}")
        
        print(f"\n✅ Complete job data saved to: {csv_filename}")
        print(f"📊 Total jobs found: {len(filtered_jobs)}")
    
    else:
        print("❌ No jobs found. Check your API configuration and network connection.")

if __name__ == "__main__":
    main()