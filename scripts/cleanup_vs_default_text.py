"""
Limpia los textos por defecto "Opción A", "Opción B", "Opción 1", "Opción 2" en
publicaciones VS antiguas. Cuando el usuario no escribió nada, el frontend rellenaba
estos textos automáticamente. A partir del fix actual ya no se rellenan, pero los
posts VS existentes en la DB todavía los tienen guardados — este script los limpia.
Solo se aplica a polls con layout='vs' (publicaciones VS).
"""
import asyncio
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient

DEFAULT_TEXTS = {"Opción A", "Opción B", "Opción 1", "Opción 2"}

async def main():
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME", "test_database")
    if not mongo_url:
        # Try loading from backend/.env
        env_path = ROOT / "backend" / ".env"
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip(); v = v.strip().strip('"').strip("'")
                if k == "MONGO_URL":
                    mongo_url = v
                elif k == "DB_NAME":
                    db_name = v

    if not mongo_url:
        print("❌ MONGO_URL no configurado")
        return

    print(f"🔌 Conectando a {mongo_url} (db={db_name})")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    total_polls_updated = 0
    total_options_cleaned = 0
    total_vs_questions_cleaned = 0

    # 1) Polls con layout='vs' — limpiar option.text en options (slide principal)
    cursor = db.polls.find({"layout": "vs"})
    async for poll in cursor:
        poll_id = poll.get("id")
        options = poll.get("options", [])
        vs_questions = poll.get("vs_questions", [])
        changed = False

        new_options = []
        for opt in options:
            if isinstance(opt, dict) and opt.get("text") in DEFAULT_TEXTS:
                opt = {**opt, "text": ""}
                total_options_cleaned += 1
                changed = True
            new_options.append(opt)

        new_vs_questions = []
        for q in vs_questions:
            if not isinstance(q, dict):
                new_vs_questions.append(q)
                continue
            q_options = q.get("options", [])
            new_q_options = []
            for opt in q_options:
                if isinstance(opt, dict) and opt.get("text") in DEFAULT_TEXTS:
                    opt = {**opt, "text": ""}
                    total_vs_questions_cleaned += 1
                    changed = True
                new_q_options.append(opt)
            new_vs_questions.append({**q, "options": new_q_options})

        if changed:
            await db.polls.update_one(
                {"id": poll_id},
                {"$set": {"options": new_options, "vs_questions": new_vs_questions}}
            )
            total_polls_updated += 1

    # 2) vs_experiences collection — la fuente de verdad de las preguntas VS
    total_vs_exp_updated = 0
    total_vs_exp_options_cleaned = 0
    cursor2 = db.vs_experiences.find({})
    async for vs in cursor2:
        vs_id = vs.get("id")
        questions = vs.get("questions", [])
        changed = False
        new_questions = []
        for q in questions:
            if not isinstance(q, dict):
                new_questions.append(q)
                continue
            q_options = q.get("options", [])
            new_q_options = []
            for opt in q_options:
                if isinstance(opt, dict) and opt.get("text") in DEFAULT_TEXTS:
                    opt = {**opt, "text": ""}
                    total_vs_exp_options_cleaned += 1
                    changed = True
                new_q_options.append(opt)
            new_questions.append({**q, "options": new_q_options})

        if changed:
            await db.vs_experiences.update_one(
                {"id": vs_id},
                {"$set": {"questions": new_questions}}
            )
            total_vs_exp_updated += 1

    print("\n✅ Limpieza completada")
    print(f"  - polls VS actualizados:     {total_polls_updated}")
    print(f"    · options limpiadas:       {total_options_cleaned}")
    print(f"    · vs_questions limpiadas:  {total_vs_questions_cleaned}")
    print(f"  - vs_experiences actualizadas: {total_vs_exp_updated}")
    print(f"    · options limpiadas:       {total_vs_exp_options_cleaned}")

if __name__ == "__main__":
    asyncio.run(main())
