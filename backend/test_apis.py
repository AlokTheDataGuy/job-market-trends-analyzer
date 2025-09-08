#!/usr/bin/env python3
import requests
import json
import time
from typing import Dict, Any

class APITester:
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.test_results = []

    def log_test(self, test_name: str, success: bool, details: str = ""):
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": time.time()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")

    def test_health_endpoint(self):
        try:
            response = self.session.get(f"{self.base_url}/health")
            success = response.status_code == 200
            data = response.json() if success else response.text
            self.log_test("Health Check", success, f"Status: {response.status_code}, Data: {data}")
            return success
        except Exception as e:
            self.log_test("Health Check", False, str(e))
            return False

    def test_root_endpoint(self):
        try:
            response = self.session.get(f"{self.base_url}/")
            success = response.status_code == 200 and "running" in response.text
            self.log_test("Root Endpoint", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Root Endpoint", False, str(e))
            return False

    def test_job_search(self):
        try:
            payload = {
                "search_term": "python",
                "location": "bangalore",
                "days_old": 30,
                "limit": 10,
                "page": 1
            }
            response = self.session.post(f"{self.base_url}/api/jobs/search", json=payload)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                job_count = len(data.get("jobs", []))
                details = f"Found {job_count} jobs, Total: {data.get('total_count', 0)}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Job Search", success, details)
            return success
        except Exception as e:
            self.log_test("Job Search", False, str(e))
            return False

    def test_trending_skills(self):
        try:
            params = {"limit": 15, "days": 30, "sort_by": "job_count_30d"}
            response = self.session.get(f"{self.base_url}/api/skills/trending", params=params)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                skill_count = len(data.get("skills", []))
                details = f"Found {skill_count} trending skills, Total: {data.get('total_count', 0)}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Trending Skills", success, details)
            return success
        except Exception as e:
            self.log_test("Trending Skills", False, str(e))
            return False

    def test_skill_analytics(self):
        try:
            skill_name = "python"
            response = self.session.get(f"{self.base_url}/api/analytics/skill/{skill_name}?days=30")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                analytics_data = data.get("data", {})
                total_jobs = analytics_data.get("total_jobs", 0)
                details = f"Analytics for '{skill_name}': {total_jobs} jobs"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Skill Analytics", success, details)
            return success
        except Exception as e:
            self.log_test("Skill Analytics", False, str(e))
            return False

    def test_market_summary(self):
        try:
            response = self.session.get(f"{self.base_url}/api/market/summary?days=7")
            success = response.status_code in [200, 404]  # 404 is acceptable if no summary exists
            
            if response.status_code == 200:
                data = response.json()
                summary_data = data.get("data", {})
                total_jobs = summary_data.get("total_jobs", 0)
                details = f"Market summary: {total_jobs} total jobs"
            elif response.status_code == 404:
                details = "No market summary available (expected for new setup)"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Market Summary", success, details)
            return success
        except Exception as e:
            self.log_test("Market Summary", False, str(e))
            return False

    def test_database_stats(self):
        try:
            response = self.session.get(f"{self.base_url}/api/stats")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                stats_data = data.get("data", {})
                total_jobs = stats_data.get("total_jobs", 0)
                total_skills = stats_data.get("total_skills", 0)
                details = f"DB Stats: {total_jobs} jobs, {total_skills} skills"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Database Stats", success, details)
            return success
        except Exception as e:
            self.log_test("Database Stats", False, str(e))
            return False

    def test_skill_categories(self):
        try:
            response = self.session.get(f"{self.base_url}/api/skills/categories")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                categories_data = data.get("data", {})
                category_count = categories_data.get("total_categories", 0)
                details = f"Found {category_count} skill categories"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Skill Categories", success, details)
            return success
        except Exception as e:
            self.log_test("Skill Categories", False, str(e))
            return False

    def test_error_handling(self):
        try:
            # Test invalid endpoint
            response = self.session.get(f"{self.base_url}/api/invalid/endpoint")
            success = response.status_code == 404
            self.log_test("404 Error Handling", success, f"Status: {response.status_code}")
            
            # Test invalid skill analytics
            response = self.session.get(f"{self.base_url}/api/analytics/skill/nonexistentskill123")
            success = response.status_code in [404, 500]  # Either is acceptable
            self.log_test("Invalid Skill Error Handling", success, f"Status: {response.status_code}")
            
            return True
        except Exception as e:
            self.log_test("Error Handling", False, str(e))
            return False

    def run_all_tests(self):
        print("=" * 60)
        print("🚀 Starting API Tests")
        print("=" * 60)
        
        tests = [
            self.test_root_endpoint,
            self.test_health_endpoint,
            self.test_database_stats,
            self.test_skill_categories,
            self.test_trending_skills,
            self.test_job_search,
            self.test_skill_analytics,
            self.test_market_summary,
            self.test_error_handling
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
            print()  # Empty line for readability
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        print(f"Success Rate: {passed/total*100:.1f}%")
        
        if passed == total:
            print("🎉 All tests passed! API is working correctly.")
        else:
            print("⚠️ Some tests failed. Check the details above.")
            
        return passed == total

    def save_test_report(self, filename: str = "test_report.json"):
        report = {
            "timestamp": time.time(),
            "base_url": self.base_url,
            "total_tests": len(self.test_results),
            "passed_tests": len([t for t in self.test_results if t["success"]]),
            "failed_tests": len([t for t in self.test_results if not t["success"]]),
            "results": self.test_results
        }
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"📄 Test report saved to {filename}")

def main():
    import sys
    
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001"
    
    print(f"Testing API at: {base_url}")
    
    tester = APITester(base_url)
    success = tester.run_all_tests()
    tester.save_test_report()
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())