import sqlite3
import os
from datetime import datetime


class ReminderManager:
    def __init__(self):
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.db_path = os.path.join(project_root, "data", "life_pilot.db")

    def add_reminder(self, data: dict) -> dict:
        try:
            text = data.get("text", "").strip()
            remind_at = data.get("remind_at", "") or ""
            if not text:
                return {"status": "error", "message": "Reminder text is required."}
            created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO reminders (text, remind_at, created_at) VALUES (?, ?, ?)",
                (text, remind_at, created_at)
            )
            new_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return {
                "status": "success",
                "message": f"Reminder added: {text}",
                "data": {"id": new_id, "text": text, "remind_at": remind_at, "created_at": created_at}
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def list_reminders(self) -> dict:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT id, text, remind_at, created_at FROM reminders ORDER BY created_at DESC")
            rows = cursor.fetchall()
            conn.close()
            return {"status": "success", "data": [
                {"id": r[0], "text": r[1], "remind_at": r[2], "created_at": r[3]} for r in rows
            ]}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def delete_reminder(self, reminder_id: int) -> dict:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
            conn.commit()
            conn.close()
            return {"status": "success", "message": "Reminder deleted."}
        except Exception as e:
            return {"status": "error", "message": str(e)}