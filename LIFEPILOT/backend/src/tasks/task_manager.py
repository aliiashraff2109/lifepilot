
import sqlite3
import os
import dateparser
from datetime import datetime


class TaskManager:

    def __init__(self):
        project_root = os.path.dirname(
            os.path.dirname(
                os.path.dirname(os.path.abspath(__file__))
            )
        )
        self.db_path = os.path.join(project_root, "data", "life_pilot.db")

    def create_task(self, data: dict) -> dict:
        try:
            title = data.get("title")
            due_date_input = data.get("due_date")
            priority = data.get("priority", "medium")
            description = data.get("description", "")

            if not title:
                return {"status": "error", "message": "Title is required."}

            due_date = None
            if due_date_input:
                parsed = dateparser.parse(due_date_input)
                if not parsed:
                    return {"status": "error", "message": "Invalid due date format."}
                if parsed.hour == 0 and parsed.minute == 0:
                    parsed = parsed.replace(hour=18, minute=0, second=0)
                due_date = parsed.strftime("%Y-%m-%d %H:%M:%S")

            created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO tasks (title, description, due_date, priority, completed, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (title, description, due_date, priority, 0, created_at))

            conn.commit()
            conn.close()

            return {
                "status": "success",
                "message": "Task created.",
                "data": {
                    "title": title,
                    "due_date": due_date,
                    "priority": priority
                }
            }

        except Exception as e:
            return {"status": "error", "message": f"Failed to create task: {str(e)}"}

    def list_tasks(self) -> dict:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("""
                SELECT id, title, description, due_date, priority, completed, created_at
                FROM tasks
                ORDER BY completed ASC, created_at DESC
            """)

            rows = cursor.fetchall()
            conn.close()

            tasks = []
            for r in rows:
                tasks.append({
                    "id": r[0],
                    "title": r[1],
                    "description": r[2],
                    "due_date": r[3],
                    "priority": r[4],
                    "completed": bool(r[5]), # This converts 1 to True and 0 to False
                    "created_at": r[6]
                })

            return {"status": "success", "data": tasks}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def complete_task(self, task_identifier) -> dict:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            if isinstance(task_identifier, int):
                cursor.execute("SELECT id FROM tasks WHERE id = ?", (task_identifier,))
            else:
                cursor.execute("""
                    SELECT id FROM tasks
                    WHERE title LIKE ? AND completed = 0
                    ORDER BY created_at DESC
                    LIMIT 1
                """, (f"%{task_identifier}%",))

            task = cursor.fetchone()

            if not task:
                conn.close()
                return {"status": "error", "message": f"Task not found for '{task_identifier}'."}

            task_id = task[0]

            cursor.execute("UPDATE tasks SET completed = 1 WHERE id = ?", (task_id,))
            conn.commit()
            conn.close()

            return {"status": "success", "message": f"Task '{task_identifier}' completed."}

        except Exception as e:
            return {"status": "error", "message": f"Failed to complete task: {str(e)}"}
    def delete_task(self, task_id: int) -> dict:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
            conn.commit()
            conn.close()
            return {"status": "success", "message": f"Task {task_id} deleted."}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    def clear_all_tasks(self) -> dict:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM tasks")
            conn.commit()
            conn.close()

            return {"status": "success", "message": "All tasks cleared."}

        except Exception as e:
            return {"status": "error", "message": str(e)}
