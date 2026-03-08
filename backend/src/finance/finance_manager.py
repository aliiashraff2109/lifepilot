import sqlite3
import os
import dateparser
from datetime import datetime


class FinanceManager:

    def __init__(self):
        project_root = os.path.dirname(
            os.path.dirname(
                os.path.dirname(os.path.abspath(__file__))
            )
        )
        self.db_path = os.path.join(project_root, "data", "life_pilot.db")

    def add_transaction(self, data: dict) -> dict:
        try:
            amount = float(data.get("amount", 0))
            category = data.get("category") or data.get("title") or "General"
            transaction_type = data.get("type", "expense") 
            description = data.get("description", "")
            date_input = data.get("date")

            if transaction_type not in ["expense", "income"]:
                transaction_type = "expense"

            if date_input:
                parsed = dateparser.parse(date_input)
                if not parsed:
                    date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                else:
                    if parsed.hour == 0 and parsed.minute == 0:
                        parsed = parsed.replace(hour=18, minute=0, second=0)
                    date = parsed.strftime("%Y-%m-%d %H:%M:%S")
            else:
                date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO transactions (amount, category, type, date, description)
                VALUES (?, ?, ?, ?, ?)
            """, (amount, category, transaction_type, date, description))
            
            conn.commit()
            conn.close()

            return {
                "status": "success", 
                "message": f"{category} added to spending.",
                "data": {
                    "title": category,
                    "amount": amount,
                    "type": transaction_type
                }
            }

        except Exception as e:
            return {"status": "error", "message": f"Failed: {str(e)}"}
    def delete_transaction(self, transaction_id: int) -> dict:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM transactions WHERE id = ?", (transaction_id,))
            conn.commit()
            conn.close()
            return {"status": "success", "message": "Transaction deleted."}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    def get_transactions(self) -> dict:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("""
                SELECT id, amount, category, type, date, description
                FROM transactions
                ORDER BY date DESC
            """)

            rows = cursor.fetchall()
            conn.close()

            transactions = [
                {
                    "id": r[0],
                    "amount": r[1],
                    "category": r[2],
                    "type": r[3],
                    "date": r[4],
                    "description": r[5]
                }
                for r in rows
            ]

            return {"status": "success", "message": "Here are your transactions.", "data": transactions}

        except Exception as e:
            return {"status": "error", "message": f"Failed to fetch transactions: {str(e)}"}

    def get_summary(self) -> dict:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("SELECT SUM(amount) FROM transactions WHERE type='income'")
            total_income = cursor.fetchone()[0] or 0

            cursor.execute("SELECT SUM(amount) FROM transactions WHERE type='expense'")
            total_expenses = cursor.fetchone()[0] or 0

            balance = total_income - total_expenses

            cursor.execute("""
                SELECT category, SUM(amount)
                FROM transactions
                WHERE type='expense'
                GROUP BY category
            """)

            category_rows = cursor.fetchall()

            category_breakdown = {
                c: {
                    "total": t,
                    "percentage": round((t / total_expenses) * 100, 2) if total_expenses else 0
                }
                for c, t in category_rows
            }

            conn.close()

            return {
                "status": "success",
                "message": "Here is your summary.",
                "data": {
                    "total_income": total_income,
                    "total_expenses": total_expenses,
                    "balance": balance,
                    "category_breakdown": category_breakdown
                }
            }

        except Exception as e:
            return {"status": "error", "message": f"Failed to generate summary: {str(e)}"}

    def clear_all_transactions(self) -> dict:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM transactions")
            conn.commit()
            conn.close()

            return {"status": "success", "message": "All transactions cleared."}

        except Exception as e:
            return {"status": "error", "message": str(e)}
