import sys
import os
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from pydantic import BaseModel

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "src"))

from nlp.parser import NLPParser
from tasks.task_manager import TaskManager
from finance.finance_manager import FinanceManager
from audio.speech_recognizer import SpeechRecognizer

speech_recognizer = SpeechRecognizer()
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


class ChatRequest(BaseModel):
    message: str


class LifePilotApp:
    def __init__(self):
        self.parser = NLPParser()
        self.task_manager = TaskManager()
        self.finance_manager = FinanceManager()
        self.speech_recognizer = SpeechRecognizer()

    def handle_text_input(self, text: str) -> dict:
        print(f"[BACKEND] Received: {text}")  # log input

        lower_text = text.lower().strip()

        # Quick commands
        if lower_text in ["summary", "finance summary"]:
            res = self.finance_manager.get_summary()
            print(f"[BACKEND] Response: {res}")
            return res
        if lower_text in ["tasks", "list tasks"]:
            res = self.task_manager.list_tasks()
            print(f"[BACKEND] Response: {res}")
            return res
        if lower_text in ["clear all"]:
            self.task_manager.clear_all_tasks()
            self.finance_manager.clear_all_transactions()
            res = {"status": "success", "message": "All tasks and expenses cleared.", "data": {}}
            print(f"[BACKEND] Response: {res}")
            return res

        # NLP parsing
        existing_titles = [task["title"] for task in self.task_manager.list_tasks().get("data", [])]
        parsed = self.parser.parse(text, existing_task_titles=existing_titles)
        print(f"[BACKEND] Parsed: {parsed}")

        intent = parsed.get("intent", "unknown")
        data = parsed.get("data", {})

        if intent == "create_task":
            res = self.task_manager.create_task(data)
            print(f"[BACKEND] Created task: {res}")
            return res
        if intent == "add_transaction":
            data["type"] = "expense"
            res = self.finance_manager.add_transaction(data)
            print(f"[BACKEND] Added expense: {res}")
            return res

        res = {"status": "error", "message": "I didn’t understand that."}
        print(f"[BACKEND] Response: {res}")
        return res

pilot_instance = LifePilotApp()

# API Routes

@app.get("/", response_class=HTMLResponse)
async def serve_home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/init")
async def get_initial_data():
    tasks = pilot_instance.task_manager.list_tasks().get("data", [])
    spending = pilot_instance.finance_manager.get_transactions().get("data", [])
    return {"tasks": tasks, "spending": spending}

@app.post("/api/chat")
async def chat_api(request: ChatRequest):
    response = pilot_instance.handle_text_input(request.message)
    return JSONResponse(response)

@app.post("/api/tasks/complete/{task_id}")
async def complete_task_direct(task_id: int):
    res = pilot_instance.task_manager.complete_task(task_id)
    return JSONResponse(res)

@app.delete("/api/tasks/{task_id}")
async def delete_task_direct(task_id: int):
    res = pilot_instance.task_manager.delete_task(task_id)
    return JSONResponse(res)

@app.delete("/api/finance/{trans_id}")
async def delete_spending_direct(trans_id: int):
    res = pilot_instance.finance_manager.delete_transaction(trans_id)
    return JSONResponse(res)

@app.post("/voice/listen")
async def voice_listen():
    text = speech_recognizer.listen()
    if text:
        return JSONResponse({"status": "success", "text": text})
    return JSONResponse({"status": "error", "text": ""})

def pretty_print(response: dict): # Debugging 
    if response.get("status") != "success":
        print("LifePilot:", response.get("message"))
        return
    data = response.get("data", {})
    if "total_income" in data and "total_expenses" in data:
        print(f"💰 Total Income: ${data['total_income']:.2f}")
        print(f"🛒 Total Expenses: ${data['total_expenses']:.2f}")
        print(f"⚖️ Balance: ${data['balance']:.2f}")
        return
    if isinstance(data, list) and all("title" in t for t in data):
        print("📝 Tasks:")
        for task in data:
            status = "✅" if task["completed"] else "❌"
            print(f"{status} {task['title']}")
        return
    print("LifePilot:", response.get("message"))

if __name__ == "__main__": # Debugging
    print("LifePilot MVP CLI - Type 'quit' to exit")
    while True:
        try:
            user_input = input("You: ")
            if user_input.lower() in ["quit", "exit"]:
                break
            response = pilot_instance.handle_text_input(user_input)
            pretty_print(response)
        except KeyboardInterrupt:
            break
