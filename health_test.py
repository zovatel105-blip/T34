#!/usr/bin/env python3
"""
Health Endpoint Test
Simple test to verify the backend health endpoint is responding correctly.
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime

# Configuration
BACKEND_URL = "https://hostname-resolver-5.preview.emergentagent.com/api"

class HealthTester:
    def __init__(self):
        self.session = None
        self.test_results = []
        
    async def setup(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()
        
    async def cleanup(self):
        """Clean up HTTP session"""
        if self.session:
            await self.session.close()
    
    async def test_health_endpoint(self):
        """Test GET /api/health endpoint"""
        print("🏥 Testing Health Endpoint...")
        
        try:
            start_time = time.time()
            
            async with self.session.get(
                f"{BACKEND_URL}/health",
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                
                response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
                
                if response.status == 200:
                    try:
                        data = await response.json()
                        print(f"✅ Health endpoint responded successfully")
                        print(f"   📊 Status Code: {response.status}")
                        print(f"   ⏱️  Response Time: {response_time:.2f}ms")
                        print(f"   📝 Response Data: {json.dumps(data, indent=2)}")
                        
                        self.test_results.append({
                            "test": "health_endpoint",
                            "status": "PASS",
                            "response_code": response.status,
                            "response_time_ms": round(response_time, 2),
                            "response_data": data,
                            "details": f"Health endpoint responded with 200 OK in {response_time:.2f}ms"
                        })
                        
                        return True
                        
                    except json.JSONDecodeError:
                        # If response is not JSON, get text
                        text_data = await response.text()
                        print(f"✅ Health endpoint responded (non-JSON)")
                        print(f"   📊 Status Code: {response.status}")
                        print(f"   ⏱️  Response Time: {response_time:.2f}ms")
                        print(f"   📝 Response Text: {text_data}")
                        
                        self.test_results.append({
                            "test": "health_endpoint",
                            "status": "PASS",
                            "response_code": response.status,
                            "response_time_ms": round(response_time, 2),
                            "response_text": text_data,
                            "details": f"Health endpoint responded with 200 OK (text) in {response_time:.2f}ms"
                        })
                        
                        return True
                        
                else:
                    error_text = await response.text()
                    print(f"❌ Health endpoint returned non-200 status")
                    print(f"   📊 Status Code: {response.status}")
                    print(f"   ⏱️  Response Time: {response_time:.2f}ms")
                    print(f"   📝 Error: {error_text}")
                    
                    self.test_results.append({
                        "test": "health_endpoint",
                        "status": "FAIL",
                        "response_code": response.status,
                        "response_time_ms": round(response_time, 2),
                        "error": f"HTTP {response.status}: {error_text}"
                    })
                    
                    return False
                    
        except asyncio.TimeoutError:
            print(f"❌ Health endpoint timeout (>10s)")
            self.test_results.append({
                "test": "health_endpoint",
                "status": "FAIL",
                "error": "Request timeout (>10s)"
            })
            return False
            
        except Exception as e:
            print(f"❌ Error testing health endpoint: {str(e)}")
            self.test_results.append({
                "test": "health_endpoint",
                "status": "ERROR",
                "error": str(e)
            })
            return False
    
    async def test_backend_connectivity(self):
        """Test basic backend connectivity"""
        print("\n🔗 Testing Backend Connectivity...")
        
        try:
            start_time = time.time()
            
            async with self.session.get(
                f"{BACKEND_URL}/",
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                
                response_time = (time.time() - start_time) * 1000
                
                if response.status == 200:
                    try:
                        data = await response.json()
                        print(f"✅ Backend API root endpoint responding")
                        print(f"   📊 Status Code: {response.status}")
                        print(f"   ⏱️  Response Time: {response_time:.2f}ms")
                        print(f"   📝 API Info: {data.get('name', 'Unknown')} v{data.get('version', 'Unknown')}")
                        
                        self.test_results.append({
                            "test": "backend_connectivity",
                            "status": "PASS",
                            "response_code": response.status,
                            "response_time_ms": round(response_time, 2),
                            "api_info": data,
                            "details": f"Backend API root responding with {data.get('name', 'API')} in {response_time:.2f}ms"
                        })
                        
                        return True
                        
                    except json.JSONDecodeError:
                        text_data = await response.text()
                        print(f"✅ Backend responding (non-JSON)")
                        print(f"   📊 Status Code: {response.status}")
                        print(f"   ⏱️  Response Time: {response_time:.2f}ms")
                        
                        self.test_results.append({
                            "test": "backend_connectivity",
                            "status": "PASS",
                            "response_code": response.status,
                            "response_time_ms": round(response_time, 2),
                            "details": f"Backend responding (text) in {response_time:.2f}ms"
                        })
                        
                        return True
                        
                else:
                    error_text = await response.text()
                    print(f"❌ Backend API root returned non-200 status")
                    print(f"   📊 Status Code: {response.status}")
                    print(f"   📝 Error: {error_text}")
                    
                    self.test_results.append({
                        "test": "backend_connectivity",
                        "status": "FAIL",
                        "response_code": response.status,
                        "error": f"HTTP {response.status}: {error_text}"
                    })
                    
                    return False
                    
        except Exception as e:
            print(f"❌ Error testing backend connectivity: {str(e)}")
            self.test_results.append({
                "test": "backend_connectivity",
                "status": "ERROR",
                "error": str(e)
            })
            return False
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("🏥 HEALTH ENDPOINT TEST SUMMARY")
        print("="*60)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["status"] == "PASS"])
        failed_tests = len([t for t in self.test_results if t["status"] == "FAIL"])
        error_tests = len([t for t in self.test_results if t["status"] == "ERROR"])
        
        print(f"📊 Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"💥 Errors: {error_tests}")
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        print(f"🎯 Success Rate: {success_rate:.1f}%")
        
        print("\n📋 Detailed Results:")
        for result in self.test_results:
            status_emoji = {
                "PASS": "✅",
                "FAIL": "❌",
                "ERROR": "💥"
            }.get(result["status"], "❓")
            
            print(f"  {status_emoji} {result['test']}: {result.get('details', result.get('error', 'No details'))}")
        
        print("\n" + "="*60)
        
        # Overall assessment
        if success_rate == 100:
            print("🎉 OVERALL ASSESSMENT: EXCELLENT - Backend health endpoint is working perfectly!")
        elif success_rate >= 50:
            print("⚠️  OVERALL ASSESSMENT: PARTIAL - Some issues with backend health")
        else:
            print("❌ OVERALL ASSESSMENT: CRITICAL - Backend health endpoint has major issues")
        
        return success_rate >= 50

async def main():
    """Main test execution"""
    print("🚀 Starting Health Endpoint Test")
    print(f"🔗 Backend URL: {BACKEND_URL}")
    print(f"🕐 Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    tester = HealthTester()
    
    try:
        # Setup
        await tester.setup()
        
        # Run tests
        health_ok = await tester.test_health_endpoint()
        connectivity_ok = await tester.test_backend_connectivity()
        
        # Print summary
        success = tester.print_summary()
        
        return success
        
    except Exception as e:
        print(f"💥 Critical error during testing: {str(e)}")
        return False
        
    finally:
        await tester.cleanup()

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)