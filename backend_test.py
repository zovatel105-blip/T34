#!/usr/bin/env python3

import requests
import json
import time
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://progress-bar-reset-1.preview.emergentagent.com"
TEST_USER = {
    "email": "backendtest@test.com",
    "password": "test1234",
    "username": "backendtest",
    "display_name": "Backend Test"
}

class MusicSearchTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.access_token = None
        self.results = []

    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = f"{status} {test_name}"
        if details:
            result += f" - {details}"
        print(result)
        self.results.append({
            "test": test_name,
            "success": success,
            "details": details
        })

    def register_and_login(self) -> bool:
        """Register and login user, return auth token"""
        try:
            # Try login first (in case user already exists)
            login_url = f"{self.base_url}/api/auth/login"
            login_data = {
                "email": TEST_USER["email"],
                "password": TEST_USER["password"]
            }
            login_response = self.session.post(login_url, json=login_data)
            
            if login_response.status_code == 200:
                data = login_response.json()
                self.access_token = data.get("access_token")
                self.log_result("User login", True, f"Token obtained: {self.access_token[:20]}...")
                return True
            
            # If login fails, try to register
            register_url = f"{self.base_url}/api/auth/register"
            response = self.session.post(register_url, json=TEST_USER)
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.access_token = data.get("access_token")
                self.log_result("User registration", True, f"Token obtained: {self.access_token[:20]}...")
                return True
            else:
                self.log_result("Auth", False, f"Login Status: {login_response.status_code}, Register Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Auth setup", False, f"Exception: {str(e)}")
            return False

    def test_music_search(self, query: str, limit: Optional[int] = None, expected_min_results: int = 20) -> Dict[str, Any]:
        """Test music search endpoint"""
        try:
            # Prepare request
            url = f"{self.base_url}/api/music/search-realtime"
            params = {"query": query}
            if limit is not None:
                params["limit"] = limit
            
            headers = {"Authorization": f"Bearer {self.access_token}"}
            
            # Make request
            response = self.session.get(url, params=params, headers=headers)
            
            if response.status_code != 200:
                self.log_result(f"Music search '{query}'", False, f"Status: {response.status_code}, Response: {response.text}")
                return {"success": False, "total": 0, "results_count": 0}
            
            # Parse response
            data = response.json()
            
            # Verify response structure
            if not data.get("success"):
                self.log_result(f"Music search '{query}'", False, f"Response success=false: {data}")
                return {"success": False, "total": 0, "results_count": 0}
            
            total = data.get("total", 0)
            results = data.get("results", [])
            results_count = len(results)
            
            # Check if meets minimum requirements
            success = total > expected_min_results and results_count > expected_min_results
            
            details = f"Total: {total}, Results: {results_count}, Limit: {limit or 'default'}"
            self.log_result(f"Music search '{query}'", success, details)
            
            return {
                "success": success,
                "total": total,
                "results_count": results_count,
                "limit_used": limit,
                "raw_response": data
            }
            
        except Exception as e:
            self.log_result(f"Music search '{query}'", False, f"Exception: {str(e)}")
            return {"success": False, "total": 0, "results_count": 0}

    def run_comprehensive_tests(self):
        """Run all music search tests"""
        print("🎵 MUSIC SEARCH TESTING - VERIFYING 200 RESULT LIMIT")
        print("=" * 60)
        
        # Step 1: Authentication
        if not self.register_and_login():
            print("❌ CRITICAL: Authentication failed - cannot proceed with tests")
            return False
        
        print("\n🔍 TESTING MUSIC SEARCH ENDPOINTS")
        print("-" * 40)
        
        # Step 2: Test with explicit limit=200
        print("\n1. Testing Bad Bunny with limit=200")
        bad_bunny_200 = self.test_music_search("bad bunny", limit=200, expected_min_results=20)
        
        # Step 3: Test default behavior (should default to 200)
        print("\n2. Testing Bad Bunny with default limit")
        bad_bunny_default = self.test_music_search("bad bunny", expected_min_results=20)
        
        # Step 4: Test with Drake
        print("\n3. Testing Drake with limit=200")
        drake_200 = self.test_music_search("drake", limit=200, expected_min_results=20)
        
        # Step 5: Test with Taylor Swift
        print("\n4. Testing Taylor Swift with limit=200")
        taylor_200 = self.test_music_search("taylor swift", limit=200, expected_min_results=20)
        
        # Step 6: Verify consistency between default and explicit limit
        print("\n5. Testing consistency - default vs explicit limit")
        consistency_test = (bad_bunny_default["total"] == bad_bunny_200["total"] and 
                          bad_bunny_default["results_count"] == bad_bunny_200["results_count"])
        self.log_result("Default limit consistency", consistency_test, 
                       f"Default: {bad_bunny_default['total']}, Explicit 200: {bad_bunny_200['total']}")
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed_tests = sum(1 for r in self.results if r["success"])
        total_tests = len(self.results)
        
        for result in self.results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['details']}")
        
        print(f"\n🎯 OVERALL RESULT: {passed_tests}/{total_tests} tests passed")
        
        # Check specific requirements
        print("\n🔍 REQUIREMENT VERIFICATION:")
        
        # Requirement 1: More than 20 results
        if bad_bunny_200["total"] > 20:
            print("✅ Returns more than 20 results (Bad Bunny)")
        else:
            print("❌ Does not return more than 20 results")
        
        # Requirement 2: Approaching 200 results 
        if bad_bunny_200["total"] > 150:  # Should get close to 200 for popular artists
            print(f"✅ Returns substantial results approaching 200 (Got: {bad_bunny_200['total']})")
        else:
            print(f"⚠️ Results count lower than expected (Got: {bad_bunny_200['total']})")
        
        # Requirement 3: Multiple queries work
        multiple_queries_work = (bad_bunny_200["success"] and drake_200["success"] and taylor_200["success"])
        if multiple_queries_work:
            print("✅ Multiple different queries work correctly")
        else:
            print("❌ Some queries failed")
        
        # Requirement 4: Default behavior works
        if bad_bunny_default["success"] and consistency_test:
            print("✅ Default behavior works (defaults to 200)")
        else:
            print("❌ Default behavior inconsistent or failing")
        
        return passed_tests == total_tests

def main():
    """Main test execution"""
    tester = MusicSearchTester()
    success = tester.run_comprehensive_tests()
    
    if success:
        print("\n🎉 ALL TESTS PASSED - Music search with 200 limit working correctly!")
    else:
        print("\n⚠️ SOME TESTS FAILED - See details above")
    
    return success

if __name__ == "__main__":
    main()