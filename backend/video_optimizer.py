"""
TikTok-Style Video Optimization System
Handles video processing, compression, and thumbnail generation efficiently

NOTE: This module uses asyncio.create_subprocess_exec() for running ffmpeg/ffprobe commands.
This is NOT the same as Python's built-in exec() — it is a safe async subprocess runner
that does not evaluate arbitrary code.
"""

import os
import asyncio
import subprocess
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import tempfile
import json
from datetime import datetime

class VideoOptimizer:
    """Ultra-fast video processing for social media apps"""
    
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp()
        self.max_duration = 60  # seconds
        self.target_resolution = (720, 1280)  # 9:16 aspect ratio
        self.max_bitrate = "1000k"  # 1 Mbps for mobile
        self.thumbnail_sizes = {
            'small': (150, 267),
            'medium': (300, 533), 
            'large': (720, 1280)
        }
    
    async def process_video_upload(self, video_path: str, user_id: str) -> Dict:
        """
        TikTok-style video processing:
        1. Immediate response to user
        2. Background processing
        3. Progressive quality delivery
        """
        
        start_time = datetime.now()
        
        try:
            # Step 1: Immediate validation and response
            basic_info = await self._get_video_info(video_path)
            if not basic_info['valid']:
                return {'success': False, 'error': basic_info['error']}
            
            # Step 2: Generate immediate placeholder
            placeholder_thumbnail = await self._generate_quick_thumbnail(video_path)
            
            # Step 3: Return immediate response
            result = {
                'success': True,
                'processing': True,
                'video_id': f"{user_id}_{int(datetime.now().timestamp())}",
                'placeholder_thumbnail': placeholder_thumbnail,
                'original_duration': basic_info['duration'],
                'estimated_processing_time': min(basic_info['duration'] * 0.5, 30)  # seconds
            }
            
            # Step 4: Start background processing (non-blocking)
            asyncio.create_task(self._background_process_video(
                video_path, 
                result['video_id'],
                user_id
            ))
            
            processing_time = (datetime.now() - start_time).total_seconds()
            result['immediate_response_time'] = processing_time
            
            print(f"⚡ Video upload response: {processing_time:.2f}s")
            return result
            
        except Exception as e:
            print(f"❌ Video processing error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def _get_video_info(self, video_path: str) -> Dict:
        """Quick video validation and basic info"""
        try:
            cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json',
                '-show_format', '-show_streams', video_path
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                return {'valid': False, 'error': 'Invalid video file'}
            
            info = json.loads(stdout.decode())
            duration = float(info['format']['duration'])
            
            # Validation
            if duration > self.max_duration:
                return {'valid': False, 'error': f'Video too long (max {self.max_duration}s)'}
            
            if duration < 1:
                return {'valid': False, 'error': 'Video too short (min 1s)'}
            
            return {
                'valid': True,
                'duration': duration,
                'size': int(info['format']['size']),
                'bitrate': int(info['format'].get('bit_rate', 0))
            }
            
        except Exception as e:
            return {'valid': False, 'error': f'Processing error: {str(e)}'}
    
    async def _generate_quick_thumbnail(self, video_path: str) -> str:
        """Generate thumbnail in <1 second"""
        try:
            thumbnail_path = os.path.join(self.temp_dir, f"thumb_{int(datetime.now().timestamp())}.jpg")
            
            cmd = [
                'ffmpeg', '-y', '-i', video_path, '-vframes', '1', 
                '-vf', f'scale={self.thumbnail_sizes["small"][0]}:{self.thumbnail_sizes["small"][1]}',
                '-q:v', '8', thumbnail_path
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL
            )
            await process.communicate()
            
            if process.returncode == 0 and os.path.exists(thumbnail_path):
                return thumbnail_path
            
            return None
            
        except Exception as e:
            print(f"❌ Thumbnail generation error: {str(e)}")
            return None
    
    async def _background_process_video(self, video_path: str, video_id: str, user_id: str):
        """Background video processing - TikTok style"""
        try:
            print(f"🔄 Background processing started for {video_id}")
            
            # Step 1: Optimize video for mobile
            optimized_path = await self._optimize_for_mobile(video_path, video_id)
            
            # Step 2: Generate multiple thumbnails
            thumbnails = await self._generate_thumbnails(video_path, video_id)
            
            # Step 3: Generate adaptive streaming versions (optional)
            streaming_versions = await self._generate_streaming_versions(optimized_path, video_id)
            
            # Step 4: Update database with processed results
            await self._update_processed_video(video_id, {
                'optimized_path': optimized_path,
                'thumbnails': thumbnails,
                'streaming_versions': streaming_versions,
                'processing_completed': True,
                'processing_time': datetime.now().isoformat()
            })
            
            print(f"✅ Background processing completed for {video_id}")
            
        except Exception as e:
            print(f"❌ Background processing failed for {video_id}: {str(e)}")
            await self._update_processed_video(video_id, {
                'processing_failed': True,
                'error': str(e)
            })
    
    async def _optimize_for_mobile(self, input_path: str, video_id: str) -> str:
        """Optimize video for mobile consumption"""
        output_path = os.path.join(self.temp_dir, f"{video_id}_optimized.mp4")
        
        cmd = [
            'ffmpeg', '-y', '-i', input_path,
            '-c:v', 'libx264',  # H.264 for compatibility
            '-preset', 'fast',  # Fast encoding
            '-crf', '23',  # Good quality/size balance
            '-maxrate', self.max_bitrate,
            '-bufsize', '2000k',
            '-vf', f'scale={self.target_resolution[0]}:{self.target_resolution[1]}:force_original_aspect_ratio=increase,crop={self.target_resolution[0]}:{self.target_resolution[1]}',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',  # Enable progressive download
            output_path
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE
        )
        _, stderr = await process.communicate()
        
        if process.returncode != 0:
            raise Exception(f"Video optimization failed: {stderr.decode()}")
        
        return output_path
    
    async def _generate_thumbnails(self, video_path: str, video_id: str) -> Dict[str, str]:
        """Generate thumbnails for all sizes"""
        thumbnails = {}
        
        for size_name, (width, height) in self.thumbnail_sizes.items():
            thumbnail_path = os.path.join(self.temp_dir, f"{video_id}_thumb_{size_name}.jpg")
            
            cmd = [
                'ffmpeg', '-y', '-i', video_path, '-vframes', '1',
                '-vf', f'scale={width}:{height}',
                '-q:v', '5', thumbnail_path
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL
            )
            await process.communicate()
            
            if process.returncode == 0:
                thumbnails[size_name] = thumbnail_path
        
        return thumbnails
    
    async def _generate_streaming_versions(self, video_path: str, video_id: str) -> Dict[str, str]:
        """Generate different quality versions for adaptive streaming"""
        versions = {}
        
        qualities = {
            'low': {'resolution': (480, 854), 'bitrate': '500k'},
            'medium': {'resolution': (720, 1280), 'bitrate': '1000k'},
            'high': {'resolution': (1080, 1920), 'bitrate': '2000k'}
        }
        
        for quality, settings in qualities.items():
            output_path = os.path.join(self.temp_dir, f"{video_id}_{quality}.mp4")
            
            cmd = [
                'ffmpeg', '-y', '-i', video_path,
                '-c:v', 'libx264', '-preset', 'fast',
                '-maxrate', settings['bitrate'],
                '-vf', f'scale={settings["resolution"][0]}:{settings["resolution"][1]}',
                '-c:a', 'aac', '-b:a', '64k',
                '-movflags', '+faststart',
                output_path
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL
            )
            await process.communicate()
            
            if process.returncode == 0:
                versions[quality] = output_path
        
        return versions
    
    async def _update_processed_video(self, video_id: str, data: Dict):
        """Update database with processing results"""
        # This would integrate with your database
        # For now, just log the completion
        print(f"📊 Video {video_id} processing update: {data}")
    
    def cleanup_temp_files(self, older_than_hours: int = 24):
        """Clean up temporary files"""
        try:
            import time
            current_time = time.time()
            
            for file_path in Path(self.temp_dir).glob("*"):
                if file_path.is_file():
                    file_age = current_time - file_path.stat().st_mtime
                    if file_age > (older_than_hours * 3600):
                        file_path.unlink()
                        
        except Exception as e:
            print(f"⚠️ Cleanup error: {str(e)}")

# Global instance
video_optimizer = VideoOptimizer()

# Background cleanup task
async def cleanup_task():
    """Background task to clean up old files"""
    while True:
        await asyncio.sleep(3600)  # Run every hour
        video_optimizer.cleanup_temp_files()

# NOTE: cleanup_task should be started via app startup event, not at module level.
# asyncio.create_task() at import time fails because no event loop is running.
# To use: call asyncio.create_task(cleanup_task()) inside an @app.on_event("startup") handler.