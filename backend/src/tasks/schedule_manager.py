import sqlite3
import os
from datetime import datetime


class ScheduleManager:
    def __init__(self):
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.db_path = os.path.join(project_root, "data", "life_pilot.db")

    def add_event(self, data: dict) -> dict:
        try:
            title = data.get("title", "").strip()
            if not title:
                return {"status": "error", "message": "Event title is required."}
            date = data.get("date", "") or ""
            time = data.get("time", "") or ""
            duration = data.get("duration", "") or ""
            notes = data.get("notes", "") or ""
            created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO schedule (title, date, time, duration, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (title, date, time, duration, notes, created_at)
            )
            new_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return {
                "status": "success",
                "message": f"Event scheduled: {title}",
                "data": {"id": new_id, "title": title, "date": date, "time": time, "duration": duration, "notes": notes}
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def list_events(self) -> dict:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT id, title, date, time, duration, notes, created_at FROM schedule ORDER BY date ASC, time ASC")
            rows = cursor.fetchall()
            conn.close()
            return {"status": "success", "data": [
                {"id": r[0], "title": r[1], "date": r[2], "time": r[3], "duration": r[4], "notes": r[5], "created_at": r[6]}
                for r in rows
            ]}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def delete_event(self, event_id: int) -> dict:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM schedule WHERE id = ?", (event_id,))
            conn.commit()
            conn.close()
            return {"status": "success", "message": "Event deleted."}
        except Exception as e:
            return {"status": "error", "message": str(e)}