"""
Script para extraer audio de publicaciones carrusel existentes que no tienen audio
"""
import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path
import uuid

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Configurar ffmpeg antes de importar audio_utils
from pydub import AudioSegment
AudioSegment.converter = "/usr/bin/ffmpeg"
AudioSegment.ffmpeg = "/usr/bin/ffmpeg"
AudioSegment.ffprobe = "/usr/bin/ffprobe"

from motor.motor_asyncio import AsyncIOMotorClient
from audio_utils import extract_audio_from_video, check_video_has_audio

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.social_media_app

UPLOAD_DIR = Path(__file__).parent / "uploads"
AUDIO_UPLOAD_DIR = UPLOAD_DIR / "audio"
AUDIO_UPLOAD_DIR.mkdir(exist_ok=True)

async def fix_carousel_posts() -> None:
    """
    Encuentra posts carrusel sin música y extrae el audio de sus videos.
    
    Scans the polls collection for carousel-layout posts without assigned music,
    extracts audio from their video options, stores it in user_audio collection,
    and updates the poll with the extracted audio references.
    """
    print("🔍 Buscando publicaciones carrusel sin audio...")
    
    # Buscar posts con layout='off' y sin music_id
    posts = await db.polls.find({
        "layout": "off",
        "$or": [
            {"music_id": {"$exists": False}},
            {"music_id": None},
            {"music_id": ""}
        ]
    }).to_list(100)
    
    print(f"📊 Encontrados {len(posts)} posts carrusel sin audio")
    
    fixed_count = 0
    
    for post in posts:
        try:
            print(f"\n🎠 Procesando post: {post['id']}")
            print(f"   Título: {post.get('title', 'Sin título')}")
            
            # Extraer audio de TODOS los videos con audio
            extracted_audios = []
            updated_options = []
            
            # Buscar info del usuario
            author_id = post.get('author_id', 'unknown')
            user = await db.users.find_one({"id": author_id})
            artist_name = "Usuario"
            if user:
                artist_name = user.get('display_name') or user.get('username', 'Usuario')
            
            for i, option in enumerate(post.get('options', [])):
                media_url = option.get('media_url')
                media_type = option.get('media_type')
                
                # Copiar la opción para actualización
                updated_option = option.copy()
                
                if media_type == 'video' and media_url:
                    # Convertir URL a path
                    if '/api/uploads/' in media_url:
                        video_filename = media_url.split('/api/uploads/')[-1]
                        video_path = UPLOAD_DIR / video_filename
                        
                        if video_path.exists():
                            print(f"   🔍 Verificando video {i}: {video_path.name}")
                            
                            if not check_video_has_audio(str(video_path)):
                                print(f"   ⏭️ Video {i} no tiene audio")
                                updated_options.append(updated_option)
                                continue
                            
                            print(f"   ✅ Video {i} tiene audio, extrayendo...")
                            
                            try:
                                # Generar nombre único para cada audio
                                timestamp = int(datetime.utcnow().timestamp())
                                unique_filename = f"carousel_audio_{author_id}_{timestamp}_opt{i}"
                                
                                # Extraer audio
                                extraction_result = extract_audio_from_video(
                                    video_path=video_path,
                                    output_dir=str(AUDIO_UPLOAD_DIR),
                                    target_filename=unique_filename,
                                    max_duration=60
                                )
                                
                                # Crear título para este audio específico
                                option_text = option.get('text', '') or f"Video {i+1}"
                                audio_title = f"{post.get('title', 'Audio')} - {option_text}"[:100]
                                audio_public_url = f"/api/uploads/audio/{extraction_result['filename']}"
                                
                                user_audio_data = {
                                    "id": str(uuid.uuid4()),
                                    "title": audio_title,
                                    "artist": artist_name,
                                    "original_filename": extraction_result['filename'],
                                    "filename": extraction_result['filename'],
                                    "file_format": "mp3",
                                    "file_size": extraction_result['file_size'],
                                    "duration": int(extraction_result['duration']),
                                    "uploader_id": author_id,
                                    "file_path": extraction_result['processed_path'],
                                    "public_url": audio_public_url,
                                    "waveform": extraction_result.get('waveform', []),
                                    "cover_url": option.get('thumbnail_url'),
                                    "privacy": "public",
                                    "uses_count": 1,
                                    "created_at": datetime.utcnow(),
                                    "updated_at": datetime.utcnow()
                                }
                                
                                # Insertar en base de datos
                                await db.user_audio.insert_one(user_audio_data)
                                
                                audio_id = f"user_audio_{user_audio_data['id']}"
                                
                                # Agregar audio_id a la opción actualizada
                                updated_option['extracted_audio_id'] = audio_id
                                
                                extracted_audios.append({
                                    'option_index': i,
                                    'audio_id': audio_id,
                                    'title': audio_title,
                                    'duration': extraction_result['duration']
                                })
                                
                                print(f"      ✅ Audio {i} extraído: {audio_id}")
                                print(f"         Título: {audio_title}")
                                print(f"         Duración: {extraction_result['duration']:.1f}s")
                                
                            except Exception as e:
                                print(f"      ⚠️ Error extrayendo audio del video {i}: {str(e)}")
                
                updated_options.append(updated_option)
            
            if not extracted_audios:
                print("   ⚠️ No se encontró ningún video con audio en este post")
                continue
            
            # El primer audio será el music_id principal
            primary_audio_id = extracted_audios[0]['audio_id']
            
            # Actualizar el post con las opciones actualizadas y el music_id
            await db.polls.update_one(
                {"id": post['id']},
                {
                    "$set": {
                        "music_id": primary_audio_id,
                        "options": updated_options
                    }
                }
            )
            
            print(f"   ✅ Total audios extraídos: {len(extracted_audios)}")
            print(f"      Music ID principal: {primary_audio_id}")
            
            fixed_count += 1
            
        except Exception as e:
            print(f"   ❌ Error procesando post {post['id']}: {str(e)}")
            import traceback
            traceback.print_exc()
            continue
    
    print(f"\n✅ Proceso completado: {fixed_count}/{len(posts)} posts corregidos")

if __name__ == "__main__":
    asyncio.run(fix_carousel_posts())
