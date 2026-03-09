import json
import re
import os
import google.genai as genai
from datetime import datetime
import dateparser
from difflib import get_close_matches
import string


class NLPParser:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")

        if not self.api_key:
            raise ValueError("[NLP ERROR] Gemini API key not found.")

        try:
            self.client = genai.Client(api_key=self.api_key)
            self._check_api_key()
        except Exception as e:
            print("[NLP ERROR] Failed to initialize Gemini client:", e)
            self.client = None

    def _check_api_key(self):
        """
        Verify that the API key works by making a tiny request.
        """
        try:
            print("[NLP] Checking Gemini API key...")

            test = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents="Return JSON: {\"intent\":\"unknown\",\"data\":{}}"
            )

            if not test or not getattr(test, "text", None):
                raise Exception("Gemini returned empty response")

            print("[NLP] Gemini API key verified successfully.")

        except Exception as e:
            print("[NLP ERROR] Gemini API key invalid or quota exceeded:", e)
            self.client = None

    def clean_task_title(self, title: str) -> str:
        title = title.lower()
        for word in ["the ", "my ", "a "]:
            if title.startswith(word):
                title = title[len(word):]

        title = title.translate(str.maketrans("", "", string.punctuation))
        return title.strip()

    def normalize_task_title(self, title: str, existing_titles: list) -> str:
        if not title:
            return ""

        clean_input = self.clean_task_title(title)
        clean_existing = {self.clean_task_title(t): t for t in existing_titles}

        matches = get_close_matches(clean_input, list(clean_existing.keys()), cutoff=0.5)

        if matches:
            return clean_existing[matches[0]]

        return title.title()

    def parse(self, text: str, existing_task_titles: list = []) -> dict:

        if not text:
            return {"intent": "unknown", "data": {}}

        if not self.client:
            print("[NLP WARNING] Gemini client unavailable, using fallback parser.")
            return self._fallback_parse(text)

        prompt = f"""
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

Return ONLY valid JSON.
"""

        try:
            print("[NLP] Sending request to Gemini:", text)

            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            if not response:
                raise Exception("Gemini returned None")

            text_response = getattr(response, "text", None)

            if not text_response:
                raise Exception("Gemini returned empty text")

            text_response = text_response.strip()

            print("[NLP RAW RESPONSE]", text_response)

            # Extract JSON block
            match = re.search(r"\{.*\}", text_response, re.DOTALL)

            if match:
                text_response = match.group(0)

            print("[NLP JSON STRING]", text_response)

            parsed_json = json.loads(text_response)

            print("[NLP PARSED JSON]", parsed_json)

            allowed_intents = [
                "create_task",
                "list_tasks",
                "complete_task",
                "add_transaction",
                "get_transactions",
                "get_summary",
                "unknown"
            ]

            intent = parsed_json.get("intent")

            if intent not in allowed_intents:
                print("[NLP WARNING] Invalid intent:", intent)
                return {"intent": "unknown", "data": {}}

            if "data" not in parsed_json:
                parsed_json["data"] = {}

            # Normalize task titles
            if parsed_json["data"].get("title"):
                parsed_json["data"]["title"] = self.normalize_task_title(
                    parsed_json["data"]["title"],
                    existing_task_titles
                )

            # Finance date handling
            if intent == "add_transaction":
                date_input = parsed_json["data"].get("date")

                if date_input:
                    parsed_date = dateparser.parse(date_input)

                    if parsed_date:
                        if parsed_date.hour == 0 and parsed_date.minute == 0:
                            parsed_date = parsed_date.replace(hour=18, minute=0, second=0)

                        parsed_json["data"]["date"] = parsed_date.strftime("%Y-%m-%d %H:%M:%S")

                    else:
                        parsed_json["data"]["date"] = datetime.now().replace(
                            hour=18, minute=0, second=0
                        ).strftime("%Y-%m-%d %H:%M:%S")

                else:
                    parsed_json["data"]["date"] = datetime.now().replace(
                        hour=18, minute=0, second=0
                    ).strftime("%Y-%m-%d %H:%M:%S")

            return parsed_json

        except Exception as e:
            print("[NLP ERROR] Gemini parsing failed:", e)
            return self._fallback_parse(text)

    def _fallback_parse(self, text: str) -> dict:
        """
        Simple rule-based backup parser.
        """

        lower = text.lower()

        if "list" in lower and "task" in lower:
            return {"intent": "list_tasks", "data": {}}

        if "complete" in lower and "task" in lower:
            return {"intent": "complete_task", "data": {"title": text}}

        amount = 0
        category = ""

        amt_match = re.search(r"(\d+\.?\d*)", text)
        if amt_match:
            amount = float(amt_match.group(1))

        cat_match = re.search(r"on (\w+)", text)
        if cat_match:
            category = cat_match.group(1)

        date_parsed = datetime.now().replace(
            hour=18, minute=0, second=0
        ).strftime("%Y-%m-%d %H:%M:%S")

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

        return {"intent": "unknown", "data": {}}
