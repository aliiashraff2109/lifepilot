import json
import re
import google.genai as genai
from datetime import datetime
import dateparser
from difflib import get_close_matches
import string

class NLPParser:
    def __init__(self):
        self.api_key = "AIzaSyCyx5_hYAE093hY0UmDq_0jjSsm88iVKr4"
        self.client = genai.Client(api_key=self.api_key)

    def clean_task_title(self, title: str) -> str:
        title = title.lower()
        for word in ["the ", "my ", "a "]:
            if title.startswith(word):
                title = title[len(word):]
        title = title.translate(str.maketrans("", "", string.punctuation))
        return title.strip()

    def normalize_task_title(self, title: str, existing_titles: list) -> str:
        """
        Fuzzy-match task titles to handle variations like 'my math homework' -> 'Math Homework'
        """
        if not title:
            return ""

        clean_input = self.clean_task_title(title)
        clean_existing = {self.clean_task_title(t): t for t in existing_titles}

        matches = get_close_matches(clean_input, list(clean_existing.keys()), cutoff=0.5)
        if matches:
            return clean_existing[matches[0]]
        return title.title()

    def parse(self, text: str, existing_task_titles: list = []) -> dict:
        prompt = f""""
You are LifePilot, an AI assistant for students.
Convert the input into STRICT JSON.

Allowed intents ONLY:
create_task
list_tasks
complete_task
add_transaction
get_transactions
get_summary
unknown

Rules:
- For finance actions use "add_transaction".
- Transaction "type" must be either "expense" or "income".
- Extract amount, category, date, and description if available.
- For tasks, extract title, description, due_date, and priority.
- If unsure, return intent "unknown".
- Always return valid JSON.

JSON Format:
{{
  "intent": "intent_name",
  "data": {{
    "title": "",
    "description": "",
    "due_date": "",
    "priority": "",
    "amount": 0,
    "category": "",
    "type": "",
    "date": ""
  }}
}}

Input: "{text}"

Return ONLY valid JSON. No markdown. No explanation.
"""

        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            text_response = response.text.strip()

            match = re.search(r"(\{.*\})", text_response, re.DOTALL)
            if match:
                text_response = match.group(1)

            parsed_json = json.loads(text_response)

            allowed_intents = [
                "create_task",
                "list_tasks",
                "complete_task",
                "add_transaction",
                "get_transactions",
                "get_summary",
                "unknown"
            ]
            if parsed_json.get("intent") not in allowed_intents:
                return {"intent": "unknown", "data": {}}

            # Normalize task title
            if "data" in parsed_json and parsed_json["data"].get("title"):
                parsed_json["data"]["title"] = self.normalize_task_title(
                    parsed_json["data"]["title"], existing_task_titles
                )

            # Handle finance date
            if parsed_json.get("intent") == "add_transaction":
                date_input = parsed_json["data"].get("date")
                if date_input:
                    parsed_date = dateparser.parse(date_input)
                    if parsed_date:
                        if parsed_date.hour == 0 and parsed_date.minute == 0:
                            parsed_date = parsed_date.replace(hour=18, minute=0, second=0)
                        parsed_json["data"]["date"] = parsed_date.strftime("%Y-%m-%d %H:%M:%S")
                    else:
                        parsed_json["data"]["date"] = datetime.now().replace(hour=18, minute=0, second=0).strftime("%Y-%m-%d %H:%M:%S")
                else:
                    parsed_json["data"]["date"] = datetime.now().replace(hour=18, minute=0, second=0).strftime("%Y-%m-%d %H:%M:%S")

            return parsed_json

        except Exception as e:
            lower = text.lower()
            # Quick NLP fallbacks
            if "list" in lower and "task" in lower:
                return {"intent": "list_tasks", "data": {}}
            if "complete" in lower and "task" in lower:
                return {"intent": "complete_task", "data": {"title": text}}

            # Finance fallbacks
            amount = 0
            category = ""
            date_parsed = datetime.now().replace(hour=18, minute=0, second=0).strftime("%Y-%m-%d %H:%M:%S")
            amt_match = re.search(r"(\d+\.?\d*)", text)
            if amt_match:
                amount = float(amt_match.group(1))
            cat_match = re.search(r"on (\w+)", text)
            if cat_match:
                category = cat_match.group(1)

            if any(word in lower for word in ["spent", "bought", "paid"]):
                return {
                    "intent": "add_transaction",
                    "data": {
                        "type": "expense",
                        "amount": amount,
                        "category": category,
                        "date": date_parsed,
                        "description": text
                    }
                }
            if any(word in lower for word in ["earned", "received", "income"]):
                return {
                    "intent": "add_transaction",
                    "data": {
                        "type": "income",
                        "amount": amount,
                        "category": category,
                        "date": date_parsed,
                        "description": text
                    }
                }

            if "transaction" in lower or "history" in lower:
                return {"intent": "get_transactions", "data": {}}
            if "summary" in lower:
                return {"intent": "get_summary", "data": {}}
