"""
Shared database module - Breaks circular dependency between server.py and push_routes.py
All modules should import `db` and `client` from here.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from config import config

mongo_url = config.MONGO_URL
client = AsyncIOMotorClient(mongo_url)
db = client[config.DB_NAME]
