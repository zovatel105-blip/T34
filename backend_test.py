#!/usr/bin/env python3

import requests
import json
import time
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://header-tabs-sticky.preview.emergentagent.com"
TEST_USER = {
    "email": "backendtest@test.com",
    "password": "test1234",
    "username": "backendtest",
    "display_name": "Backend Test"
}

# Demo user credentials from test_credentials.md
DEMO_USER = {
    "email": "demo@example.com",
    "password": "demo123",
    "username": "demo_user"
}

# Test user for polls testing
POLLS_TEST_USER = {
    "email": "pollstest@test.com",
    "password": "test1234",
    "username": "pollstest",
    "display_name": "Polls Test User"
}

class UserPollsEndpointTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.access_token = None
        self.demo_user_id = None
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

    def login_demo_user(self) -> bool:
        """Login with demo user credentials"""
        try:
            # Try polls test user first
            login_url = f"{self.base_url}/api/auth/login"
            login_data = {
                "email": POLLS_TEST_USER["email"],
                "password": POLLS_TEST_USER["password"]
            }
            response = self.session.post(login_url, json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                user_data = data.get("user", {})
                self.demo_user_id = user_data.get("id")
                self.log_result("Polls test user login", True, f"Token obtained, User ID: {self.demo_user_id}")
                return True
            
            # Fallback to demo user
            login_data = {
                "email": DEMO_USER["email"],
                "password": DEMO_USER["password"]
            }
            response = self.session.post(login_url, json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                user_data = data.get("user", {})
                self.demo_user_id = user_data.get("id")
                self.log_result("Demo user login", True, f"Token obtained, User ID: {self.demo_user_id}")
                return True
            else:
                self.log_result("User login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("User login", False, f"Exception: {str(e)}")
            return False

    def test_user_polls_with_auth(self, user_id: str, limit: Optional[int] = None, offset: Optional[int] = None) -> Dict[str, Any]:
        """Test GET /api/users/{user_id}/polls with authentication"""
        try:
            url = f"{self.base_url}/api/users/{user_id}/polls"
            params = {}
            if limit is not None:
                params["limit"] = limit
            if offset is not None:
                params["offset"] = offset
            
            headers = {"Authorization": f"Bearer {self.access_token}"}
            response = self.session.get(url, params=params, headers=headers)
            
            test_name = f"GET /api/users/{user_id}/polls (authenticated)"
            if params:
                test_name += f" with params {params}"
            
            if response.status_code == 200:
                data = response.json()
                polls = data.get("polls", [])
                total = data.get("total", 0)
                
                details = f"Status: 200, Polls: {len(polls)}, Total: {total}"
                self.log_result(test_name, True, details)
                return {"success": True, "data": data, "status": 200}
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                self.log_result(test_name, False, details)
                return {"success": False, "status": response.status_code, "response": response.text}
                
        except Exception as e:
            self.log_result(test_name, False, f"Exception: {str(e)}")
            return {"success": False, "error": str(e)}

    def test_user_polls_without_auth(self, user_id: str) -> Dict[str, Any]:
        """Test GET /api/users/{user_id}/polls without authentication (should return 401)"""
        try:
            url = f"{self.base_url}/api/users/{user_id}/polls"
            response = self.session.get(url)  # No Authorization header
            
            test_name = f"GET /api/users/{user_id}/polls (no auth)"
            
            if response.status_code == 401:
                self.log_result(test_name, True, "Status: 401 (Unauthorized as expected)")
                return {"success": True, "status": 401}
            else:
                details = f"Status: {response.status_code} (expected 401), Response: {response.text[:200]}"
                self.log_result(test_name, False, details)
                return {"success": False, "status": response.status_code}
                
        except Exception as e:
            self.log_result(test_name, False, f"Exception: {str(e)}")
            return {"success": False, "error": str(e)}

    def test_user_polls_invalid_user(self) -> Dict[str, Any]:
        """Test GET /api/users/{user_id}/polls with invalid user ID (should return 404)"""
        try:
            invalid_user_id = "00000000-0000-0000-0000-000000000000"  # Non-existent UUID
            url = f"{self.base_url}/api/users/{invalid_user_id}/polls"
            headers = {"Authorization": f"Bearer {self.access_token}"}
            response = self.session.get(url, headers=headers)
            
            test_name = f"GET /api/users/{invalid_user_id}/polls (invalid user)"
            
            if response.status_code == 404:
                self.log_result(test_name, True, "Status: 404 (Not Found as expected)")
                return {"success": True, "status": 404}
            else:
                details = f"Status: {response.status_code} (expected 404), Response: {response.text[:200]}"
                self.log_result(test_name, False, details)
                return {"success": False, "status": response.status_code}
                
        except Exception as e:
            self.log_result(test_name, False, f"Exception: {str(e)}")
            return {"success": False, "error": str(e)}

    def test_user_polls_by_username(self) -> Dict[str, Any]:
        """Test GET /api/users/{username}/polls using username instead of UUID"""
        try:
            username = DEMO_USER["username"]
            url = f"{self.base_url}/api/users/{username}/polls"
            headers = {"Authorization": f"Bearer {self.access_token}"}
            response = self.session.get(url, headers=headers)
            
            test_name = f"GET /api/users/{username}/polls (by username)"
            
            if response.status_code == 200:
                data = response.json()
                polls = data.get("polls", [])
                total = data.get("total", 0)
                
                details = f"Status: 200, Polls: {len(polls)}, Total: {total}"
                self.log_result(test_name, True, details)
                return {"success": True, "data": data, "status": 200}
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                self.log_result(test_name, False, details)
                return {"success": False, "status": response.status_code}
                
        except Exception as e:
            self.log_result(test_name, False, f"Exception: {str(e)}")
            return {"success": False, "error": str(e)}

    def run_comprehensive_tests(self):
        """Run all user polls endpoint tests"""
        print("👤 USER POLLS ENDPOINT TESTING - GET /api/users/{user_id}/polls")
        print("=" * 70)
        
        # Step 1: Authentication
        if not self.login_demo_user():
            print("❌ CRITICAL: Authentication failed - cannot proceed with tests")
            return False
        
        print(f"\n🔍 TESTING USER POLLS ENDPOINT")
        print("-" * 50)
        
        # Step 2: Test with valid user ID and authentication
        print("\n1. Testing with valid user ID and authentication")
        valid_auth_test = self.test_user_polls_with_auth(self.demo_user_id)
        
        # Step 3: Test without authentication (should return 401)
        print("\n2. Testing without authentication (should return 401)")
        no_auth_test = self.test_user_polls_without_auth(self.demo_user_id)
        
        # Step 4: Test with invalid user ID (should return 404)
        print("\n3. Testing with invalid user ID (should return 404)")
        invalid_user_test = self.test_user_polls_invalid_user()
        
        # Step 5: Test with username instead of UUID
        print("\n4. Testing with username instead of UUID")
        username_test = self.test_user_polls_by_username()
        
        # Step 6: Test with limit parameter
        print("\n5. Testing with limit parameter")
        limit_test = self.test_user_polls_with_auth(self.demo_user_id, limit=10)
        
        # Step 7: Test with offset parameter
        print("\n6. Testing with offset parameter")
        offset_test = self.test_user_polls_with_auth(self.demo_user_id, offset=5)
        
        # Step 8: Test with both limit and offset
        print("\n7. Testing with both limit and offset parameters")
        limit_offset_test = self.test_user_polls_with_auth(self.demo_user_id, limit=5, offset=2)
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 TEST SUMMARY")
        print("=" * 70)
        
        passed_tests = sum(1 for r in self.results if r["success"])
        total_tests = len(self.results)
        
        for result in self.results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['details']}")
        
        print(f"\n🎯 OVERALL RESULT: {passed_tests}/{total_tests} tests passed")
        
        # Check specific requirements
        print("\n🔍 REQUIREMENT VERIFICATION:")
        
        # Requirement 1: Authentication required
        if no_auth_test["success"]:
            print("✅ Requires authentication (returns 401 without token)")
        else:
            print("❌ Authentication requirement not working properly")
        
        # Requirement 2: Valid user ID works
        if valid_auth_test["success"]:
            print("✅ Works with valid user ID and authentication")
        else:
            print("❌ Does not work with valid user ID")
        
        # Requirement 3: Invalid user returns 404
        if invalid_user_test["success"]:
            print("✅ Returns 404 for invalid user ID")
        else:
            print("❌ Does not return 404 for invalid user ID")
        
        # Requirement 4: Username support
        if username_test["success"]:
            print("✅ Supports username parameter")
        else:
            print("❌ Username parameter not working")
        
        # Requirement 5: Query parameters work
        if limit_test["success"] and offset_test["success"]:
            print("✅ Limit and offset parameters work")
        else:
            print("❌ Query parameters not working properly")
        
        return passed_tests == total_tests


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
    print("🚀 BACKEND API TESTING SUITE")
    print("=" * 50)
    
    # Test 1: User Polls Endpoint
    print("\n🔥 TESTING NEW ENDPOINT: GET /api/users/{user_id}/polls")
    user_polls_tester = UserPollsEndpointTester()
    user_polls_success = user_polls_tester.run_comprehensive_tests()
    
    # Test 2: Music Search (existing test)
    print("\n\n🎵 TESTING EXISTING ENDPOINT: Music Search")
    music_tester = MusicSearchTester()
    music_success = music_tester.run_comprehensive_tests()
    
    # Overall summary
    print("\n" + "=" * 70)
    print("🏁 FINAL TESTING SUMMARY")
    print("=" * 70)
    
    if user_polls_success:
        print("✅ User Polls Endpoint: ALL TESTS PASSED")
    else:
        print("❌ User Polls Endpoint: SOME TESTS FAILED")
    
    if music_success:
        print("✅ Music Search Endpoint: ALL TESTS PASSED")
    else:
        print("❌ Music Search Endpoint: SOME TESTS FAILED")
    
    overall_success = user_polls_success and music_success
    
    if overall_success:
        print("\n🎉 ALL BACKEND TESTS PASSED!")
    else:
        print("\n⚠️ SOME BACKEND TESTS FAILED - See details above")
    
    return overall_success

if __name__ == "__main__":
    main()