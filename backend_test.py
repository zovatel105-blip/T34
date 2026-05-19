#!/usr/bin/env python3
"""
Backend Test Suite for Poll Status System

Tests the new "status" field implementation for hiding broken posts.
Validates that:
1. Listing endpoints filter out posts with status="broken"
2. Individual poll endpoint still returns broken polls
3. Poll creation validates media and sets status correctly
4. Audio posts endpoint filters broken polls
"""

import asyncio
import httpx
import json
import os
import sys
from typing import Dict, List, Optional
from datetime import datetime

# Test configuration
BACKEND_URL = "https://hostname-resolver-3.preview.emergentagent.com/api"
BROKEN_POLL_ID = "685e9de8-8dc4-49ec-94c0-8e0da20e2ae4"

# Test credentials - using created test user
TEST_EMAIL = "test@test.com"
TEST_PASSWORD = "test123"

class PollStatusTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.auth_token = None
        self.current_user = None
        
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    async def authenticate(self) -> bool:
        """Authenticate with test credentials"""
        try:
            print(f"🔐 Authenticating with {TEST_EMAIL}...")
            
            response = await self.client.post(f"{BACKEND_URL}/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.current_user = data.get("user")
                print(f"✅ Authentication successful for user: {self.current_user.get('username')}")
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            return False
    
    def get_headers(self) -> Dict[str, str]:
        """Get headers with authentication"""
        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return headers
    
    async def test_listing_endpoints_filter_broken(self) -> Dict[str, bool]:
        """Test that all listing endpoints filter out broken posts"""
        print("\n🔍 Testing listing endpoints filter broken posts...")
        
        endpoints_to_test = [
            "/polls",
            "/polls/fast", 
            "/polls/ultra-fast",
            "/polls/battles",
            "/polls/following",
            "/search?query=test"
        ]
        
        results = {}
        
        for endpoint in endpoints_to_test:
            try:
                print(f"  Testing {endpoint}...")
                response = await self.client.get(
                    f"{BACKEND_URL}{endpoint}",
                    headers=self.get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Handle different response structures
                    if isinstance(data, list):
                        polls = data
                    else:
                        polls = data.get("polls", data.get("results", []))
                    
                    # Check if broken poll is NOT in results
                    broken_poll_found = any(
                        poll.get("id") == BROKEN_POLL_ID 
                        for poll in polls
                    )
                    
                    if broken_poll_found:
                        print(f"    ❌ BROKEN POLL FOUND in {endpoint}")
                        results[endpoint] = False
                    else:
                        print(f"    ✅ Broken poll correctly filtered from {endpoint}")
                        results[endpoint] = True
                        
                else:
                    print(f"    ⚠️  {endpoint} returned {response.status_code}")
                    results[endpoint] = False
                    
            except Exception as e:
                print(f"    ❌ Error testing {endpoint}: {e}")
                results[endpoint] = False
        
        return results
    
    async def test_individual_poll_endpoint(self) -> bool:
        """Test that individual poll endpoint still returns broken polls"""
        print(f"\n🔍 Testing individual poll endpoint for broken poll {BROKEN_POLL_ID}...")
        
        try:
            response = await self.client.get(
                f"{BACKEND_URL}/polls/{BROKEN_POLL_ID}",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                poll_id = data.get("id")
                
                if poll_id == BROKEN_POLL_ID:
                    print("✅ Individual poll endpoint correctly returns broken poll")
                    return True
                else:
                    print(f"❌ Individual poll endpoint returned wrong poll: {poll_id}")
                    return False
            else:
                print(f"❌ Individual poll endpoint failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing individual poll endpoint: {e}")
            return False
    
    async def test_poll_creation_validation(self) -> Dict[str, bool]:
        """Test poll creation with valid and invalid media URLs"""
        print("\n🔍 Testing poll creation validation...")
        
        results = {}
        
        # Test 1: Valid poll creation
        print("  Testing valid poll creation...")
        try:
            valid_poll_data = {
                "title": "Test Poll - Valid Media",
                "description": "Testing poll creation with valid media",
                "options": [
                    {
                        "text": "Option 1",
                        "media_type": "image",
                        "media_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400"
                    },
                    {
                        "text": "Option 2", 
                        "media_type": "image",
                        "media_url": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400"
                    }
                ],
                "tags": ["test"],
                "category": "test"
            }
            
            response = await self.client.post(
                f"{BACKEND_URL}/polls",
                json=valid_poll_data,
                headers=self.get_headers()
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                poll_id = data.get("id")
                
                # Check the poll status in database by fetching it
                poll_response = await self.client.get(
                    f"{BACKEND_URL}/polls/{poll_id}",
                    headers=self.get_headers()
                )
                
                if poll_response.status_code == 200:
                    poll_data = poll_response.json()
                    # For valid polls, they should appear in listings (status="ready")
                    print(f"    ✅ Valid poll created successfully: {poll_id}")
                    results["valid_poll_creation"] = True
                else:
                    print(f"    ❌ Could not fetch created poll: {poll_response.status_code}")
                    results["valid_poll_creation"] = False
            else:
                print(f"    ❌ Valid poll creation failed: {response.status_code} - {response.text}")
                results["valid_poll_creation"] = False
                
        except Exception as e:
            print(f"    ❌ Error testing valid poll creation: {e}")
            results["valid_poll_creation"] = False
        
        # Test 2: Invalid poll creation (broken media)
        print("  Testing invalid poll creation...")
        try:
            invalid_poll_data = {
                "title": "Test Poll - Invalid Media",
                "description": "Testing poll creation with invalid media",
                "options": [
                    {
                        "text": "Option 1",
                        "media_type": "video",
                        "media_url": "/api/uploads/videos/NONEXISTENT.mp4"
                    },
                    {
                        "text": "Option 2",
                        "media_type": "image", 
                        "media_url": "https://nonexistent-domain-12345.com/image.jpg"
                    }
                ],
                "tags": ["test"],
                "category": "test"
            }
            
            response = await self.client.post(
                f"{BACKEND_URL}/polls",
                json=invalid_poll_data,
                headers=self.get_headers()
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                poll_id = data.get("id")
                
                # The poll should be created but marked as broken
                # Check if it appears in listings (it shouldn't)
                await asyncio.sleep(2)  # Give time for validation
                
                listing_response = await self.client.get(
                    f"{BACKEND_URL}/polls",
                    headers=self.get_headers()
                )
                
                if listing_response.status_code == 200:
                    listing_data = listing_response.json()
                    
                    # Handle different response structures
                    if isinstance(listing_data, list):
                        polls = listing_data
                    else:
                        polls = listing_data.get("polls", [])
                    
                    # Check if the broken poll appears in listings
                    broken_poll_in_listing = any(
                        poll.get("id") == poll_id 
                        for poll in polls
                    )
                    
                    if not broken_poll_in_listing:
                        print(f"    ✅ Invalid poll correctly marked as broken and filtered: {poll_id}")
                        results["invalid_poll_creation"] = True
                    else:
                        print(f"    ❌ Invalid poll appears in listings (should be filtered): {poll_id}")
                        results["invalid_poll_creation"] = False
                else:
                    print(f"    ❌ Could not fetch polls listing: {listing_response.status_code}")
                    results["invalid_poll_creation"] = False
            else:
                print(f"    ❌ Invalid poll creation failed: {response.status_code} - {response.text}")
                results["invalid_poll_creation"] = False
                
        except Exception as e:
            print(f"    ❌ Error testing invalid poll creation: {e}")
            results["invalid_poll_creation"] = False
        
        return results
    
    async def test_user_profile_endpoints(self) -> Dict[str, bool]:
        """Test user profile endpoints filter broken polls"""
        print("\n🔍 Testing user profile endpoints...")
        
        results = {}
        
        # We need to find a user who might have the broken poll
        # Let's try to get the broken poll first to find its author
        try:
            broken_poll_response = await self.client.get(
                f"{BACKEND_URL}/polls/{BROKEN_POLL_ID}",
                headers=self.get_headers()
            )
            
            if broken_poll_response.status_code == 200:
                broken_poll_data = broken_poll_response.json()
                author_id = broken_poll_data.get("author", {}).get("id")
                
                if author_id:
                    print(f"  Testing user polls endpoint for author: {author_id}")
                    
                    user_polls_response = await self.client.get(
                        f"{BACKEND_URL}/users/{author_id}/polls",
                        headers=self.get_headers()
                    )
                    
                    if user_polls_response.status_code == 200:
                        user_polls_data = user_polls_response.json()
                        polls = user_polls_data.get("polls", [])
                        
                        # Check if broken poll is filtered from user's polls
                        broken_poll_found = any(
                            poll.get("id") == BROKEN_POLL_ID 
                            for poll in polls
                        )
                        
                        if not broken_poll_found:
                            print("    ✅ User polls endpoint correctly filters broken poll")
                            results["user_polls"] = True
                        else:
                            print("    ❌ User polls endpoint shows broken poll")
                            results["user_polls"] = False
                    else:
                        print(f"    ⚠️  User polls endpoint returned {user_polls_response.status_code}")
                        results["user_polls"] = False
                else:
                    print("    ⚠️  Could not find author ID for broken poll")
                    results["user_polls"] = False
            else:
                print(f"    ⚠️  Could not fetch broken poll: {broken_poll_response.status_code}")
                results["user_polls"] = False
                
        except Exception as e:
            print(f"    ❌ Error testing user profile endpoints: {e}")
            results["user_polls"] = False
        
        return results
    
    async def test_audio_posts_endpoint(self) -> bool:
        """Test that audio posts endpoint filters broken polls"""
        print("\n🔍 Testing audio posts endpoint...")
        
        try:
            # Get a sample audio ID to test with
            # We'll use a common audio ID or test with any available audio
            response = await self.client.get(
                f"{BACKEND_URL}/music/library?limit=1",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                music_list = data.get("music", [])
                
                if music_list:
                    audio_id = music_list[0].get("id")
                    
                    # Test the audio posts endpoint
                    audio_posts_response = await self.client.get(
                        f"{BACKEND_URL}/audio/{audio_id}/posts",
                        headers=self.get_headers()
                    )
                    
                    if audio_posts_response.status_code == 200:
                        audio_posts_data = audio_posts_response.json()
                        posts = audio_posts_data.get("posts", [])
                        
                        # Check if any broken polls appear
                        broken_poll_found = any(
                            post.get("id") == BROKEN_POLL_ID 
                            for post in posts
                        )
                        
                        if not broken_poll_found:
                            print("    ✅ Audio posts endpoint correctly filters broken polls")
                            return True
                        else:
                            print("    ❌ Audio posts endpoint shows broken poll")
                            return False
                    else:
                        print(f"    ⚠️  Audio posts endpoint returned {audio_posts_response.status_code}")
                        return False
                else:
                    print("    ⚠️  No music found to test audio posts endpoint")
                    return False
            else:
                print(f"    ⚠️  Music library endpoint returned {response.status_code}")
                return False
                
        except Exception as e:
            print(f"    ❌ Error testing audio posts endpoint: {e}")
            return False
    
    async def check_broken_poll_exists(self) -> bool:
        """Check if the specific broken poll exists in database"""
        print(f"\n🔍 Checking if broken poll {BROKEN_POLL_ID} exists...")
        
        try:
            response = await self.client.get(
                f"{BACKEND_URL}/polls/{BROKEN_POLL_ID}",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                poll_id = data.get("id")
                title = data.get("title", "")
                
                if poll_id == BROKEN_POLL_ID:
                    print(f"✅ Broken poll exists: '{title}'")
                    return True
                else:
                    print(f"❌ Poll ID mismatch: expected {BROKEN_POLL_ID}, got {poll_id}")
                    return False
            elif response.status_code == 404:
                print(f"❌ Broken poll {BROKEN_POLL_ID} not found in database")
                return False
            else:
                print(f"❌ Error fetching broken poll: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error checking broken poll existence: {e}")
            return False
    
    async def run_all_tests(self) -> Dict[str, any]:
        """Run all tests and return results"""
        print("🚀 Starting Poll Status System Tests")
        print("=" * 50)
        
        # Authenticate first
        if not await self.authenticate():
            return {"error": "Authentication failed"}
        
        results = {
            "authentication": True,
            "broken_poll_exists": False,
            "listing_endpoints": {},
            "individual_poll": False,
            "poll_creation": {},
            "user_profile": {},
            "audio_posts": False
        }
        
        # Check if broken poll exists
        results["broken_poll_exists"] = await self.check_broken_poll_exists()
        
        # Test listing endpoints
        results["listing_endpoints"] = await self.test_listing_endpoints_filter_broken()
        
        # Test individual poll endpoint
        results["individual_poll"] = await self.test_individual_poll_endpoint()
        
        # Test poll creation validation
        results["poll_creation"] = await self.test_poll_creation_validation()
        
        # Test user profile endpoints
        results["user_profile"] = await self.test_user_profile_endpoints()
        
        # Test audio posts endpoint
        results["audio_posts"] = await self.test_audio_posts_endpoint()
        
        return results

def print_test_summary(results: Dict[str, any]):
    """Print a summary of test results"""
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    total_tests = 0
    passed_tests = 0
    
    # Authentication
    if results.get("authentication"):
        print("✅ Authentication: PASSED")
        passed_tests += 1
    else:
        print("❌ Authentication: FAILED")
    total_tests += 1
    
    # Broken poll exists
    if results.get("broken_poll_exists"):
        print("✅ Broken poll exists: PASSED")
        passed_tests += 1
    else:
        print("❌ Broken poll exists: FAILED")
    total_tests += 1
    
    # Listing endpoints
    listing_results = results.get("listing_endpoints", {})
    listing_passed = sum(1 for v in listing_results.values() if v)
    listing_total = len(listing_results)
    
    if listing_passed == listing_total and listing_total > 0:
        print(f"✅ Listing endpoints filter: PASSED ({listing_passed}/{listing_total})")
        passed_tests += 1
    else:
        print(f"❌ Listing endpoints filter: FAILED ({listing_passed}/{listing_total})")
        for endpoint, result in listing_results.items():
            status = "✅" if result else "❌"
            print(f"    {status} {endpoint}")
    total_tests += 1
    
    # Individual poll endpoint
    if results.get("individual_poll"):
        print("✅ Individual poll endpoint: PASSED")
        passed_tests += 1
    else:
        print("❌ Individual poll endpoint: FAILED")
    total_tests += 1
    
    # Poll creation validation
    creation_results = results.get("poll_creation", {})
    creation_passed = sum(1 for v in creation_results.values() if v)
    creation_total = len(creation_results)
    
    if creation_passed == creation_total and creation_total > 0:
        print(f"✅ Poll creation validation: PASSED ({creation_passed}/{creation_total})")
        passed_tests += 1
    else:
        print(f"❌ Poll creation validation: FAILED ({creation_passed}/{creation_total})")
        for test, result in creation_results.items():
            status = "✅" if result else "❌"
            print(f"    {status} {test}")
    total_tests += 1
    
    # User profile endpoints
    profile_results = results.get("user_profile", {})
    profile_passed = sum(1 for v in profile_results.values() if v)
    profile_total = len(profile_results)
    
    if profile_passed == profile_total and profile_total > 0:
        print(f"✅ User profile endpoints: PASSED ({profile_passed}/{profile_total})")
        passed_tests += 1
    else:
        print(f"❌ User profile endpoints: FAILED ({profile_passed}/{profile_total})")
        for test, result in profile_results.items():
            status = "✅" if result else "❌"
            print(f"    {status} {test}")
    total_tests += 1
    
    # Audio posts endpoint
    if results.get("audio_posts"):
        print("✅ Audio posts endpoint: PASSED")
        passed_tests += 1
    else:
        print("❌ Audio posts endpoint: FAILED")
    total_tests += 1
    
    print("\n" + "=" * 50)
    print(f"📈 OVERALL RESULT: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 ALL TESTS PASSED! Poll status system is working correctly.")
    else:
        print("⚠️  Some tests failed. Please review the implementation.")
    
    print("=" * 50)

async def main():
    """Main test runner"""
    async with PollStatusTester() as tester:
        results = await tester.run_all_tests()
        print_test_summary(results)
        
        # Return exit code based on results
        if "error" in results:
            return 1
        
        # Count successful tests
        total_success = 0
        total_tests = 0
        
        # Count individual test results
        if results.get("authentication"): total_success += 1
        total_tests += 1
        
        if results.get("broken_poll_exists"): total_success += 1
        total_tests += 1
        
        listing_results = results.get("listing_endpoints", {})
        if all(listing_results.values()) and listing_results: total_success += 1
        total_tests += 1
        
        if results.get("individual_poll"): total_success += 1
        total_tests += 1
        
        creation_results = results.get("poll_creation", {})
        if all(creation_results.values()) and creation_results: total_success += 1
        total_tests += 1
        
        profile_results = results.get("user_profile", {})
        if all(profile_results.values()) and profile_results: total_success += 1
        total_tests += 1
        
        if results.get("audio_posts"): total_success += 1
        total_tests += 1
        
        return 0 if total_success == total_tests else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)