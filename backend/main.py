import sys
import os
import json
import google.generativeai as genai
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(BASE_DIR, "src"))

from nlp.parser import NLPParser
from tasks.task_manager import TaskManager
from tasks.reminder_manager import ReminderManager
from tasks.schedule_manager import ScheduleManager
from finance.finance_manager import FinanceManager
from audio.speech_recognizer import SpeechRecognizer

app = FastAPI()
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

# Initialize Gemini API
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables")
genai.configure(api_key=gemini_api_key)

# ── Request models ─────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str

class ReminderRequest(BaseModel):
    text: str
    remind_at: str = ""

class ScheduleRequest(BaseModel):
    title: str
    date: str = ""
    time: str = ""
    duration: str = ""
    notes: str = ""


# ── Context builder ────────────────────────────────────────────────────────────
def build_context(task_mgr, finance_mgr, reminder_mgr, schedule_mgr) -> str:
    tasks     = task_mgr.list_tasks().get("data", [])
    spending  = finance_mgr.get_transactions().get("data", [])
    summary   = finance_mgr.get_summary().get("data", {})
    reminders = reminder_mgr.list_reminders().get("data", [])
    events    = schedule_mgr.list_events().get("data", [])

    pending   = [t for t in tasks if not t.get("completed")]
    completed = [t for t in tasks if t.get("completed")]

    lines = [f"=== LifePilot User Data ({datetime.now().strftime('%A %B %d %Y, %H:%M')}) ==="]

    lines.append("\nTASKS (Pending):")
    if pending:
        for t in pending:
            due = f" | due: {t['due_date']}" if t.get("due_date") else ""
            pri = f" [{t.get('priority','').upper()}]" if t.get("priority") else ""
            lines.append(f"  • {t['title']}{pri}{due}")
    else:
        lines.append("  No pending tasks.")

    lines.append("\nTASKS (Completed):")
    if completed:
        for t in completed:
            lines.append(f"  ✓ {t['title']}")
    else:
        lines.append("  No completed tasks yet.")

    lines.append("\nREMINDERS:")
    if reminders:
        for r in reminders:
            at = f" (remind at: {r['remind_at']})" if r.get("remind_at") else ""
            lines.append(f"  • {r['text']}{at}")
    else:
        lines.append("  No reminders.")

    lines.append("\nSCHEDULE/EVENTS:")
    if events:
        for e in events:
            when = ""
            if e.get("date"):     when += f" on {e['date']}"
            if e.get("time"):     when += f" at {e['time']}"
            if e.get("duration"): when += f" ({e['duration']})"
            notes = f" — {e['notes']}" if e.get("notes") else ""
            lines.append(f"  • {e['title']}{when}{notes}")
    else:
        lines.append("  No scheduled events.")

    lines.append("\nSPENDING:")
    if spending:
        for s in spending:
            amt = float(s.get('amount', 0))
            cat = s.get('category', 'Other')
            date_str = str(s.get('date', ''))[:10]
            lines.append(f"  • {cat}: ${amt:.2f} — {date_str}")
        lines.append(f"\n  ── SUMMARY ──")
        lines.append(f"  Total expenses: ${float(summary.get('total_expenses', 0)):.2f}")
        lines.append(f"  Total income:   ${float(summary.get('total_income', 0)):.2f}")
        lines.append(f"  Balance:        ${float(summary.get('balance', 0)):.2f}")
    else:
        lines.append("  No spending records.")

    return "\n".join(lines)


# ── System prompt for Gemini AI chat ───────────────────────────────────────────
GEMINI_SYSTEM = """You are LifePilot, a smart personal productivity AI assistant.

Your job:
- Answer questions about the user's tasks, reminders, schedule, and spending
- Give practical advice on productivity, time management, and budgeting
- When asked to plan a day/week, build a detailed schedule using their existing tasks and events
- Be encouraging, friendly, and concise (2-4 sentences) unless they ask for details
- Never make up data — only refer to what you see in the context below

When building schedules: format clearly with times, durations, and helpful notes.
Always consider the user's existing tasks, reminders, and calendar events."""


# ── App ────────────────────────────────────────────────────────────────────────
class LifePilotApp:
    def __init__(self):
        self.parser           = NLPParser()
        self.task_manager     = TaskManager()
        self.reminder_manager = ReminderManager()
        self.schedule_manager = ScheduleManager()
        self.finance_manager  = FinanceManager()
        self.speech_recognizer = SpeechRecognizer()
        self.chat_history     = []

    def ai_chat_gemini(self, user_message: str) -> str:
        """Use Gemini for AI chat with full user context."""
        context = build_context(
            self.task_manager, self.finance_manager,
            self.reminder_manager, self.schedule_manager
        )
        
        system_with_context = GEMINI_SYSTEM + "\n\n" + context
        
        self.chat_history.append({"role": "user", "parts": [user_message]})
        
        try:
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction=system_with_context
            )
            
            history_for_api = []
            for msg in self.chat_history[-10:]:
                if msg["role"] == "user":
                    history_for_api.append({"role": "user", "parts": [msg.get("parts", [msg.get("message", "")])[0]]})
                else:
                    history_for_api.append({"role": "model", "parts": [msg.get("parts", [msg.get("message", "")])[0]]})
            
            chat = model.start_chat(history=history_for_api[:-1] if history_for_api else [])
            response = chat.send_message(user_message)
            reply = response.text
            
        except Exception as e:
            print(f"[BACKEND] Gemini chat error: {e}")
            reply = "Sorry, I'm having trouble connecting right now. Please try again."

        self.chat_history.append({"role": "model", "parts": [reply]})
        return reply

    def handle_nlp(self, text: str) -> dict:
        """Use Gemini NLP parser for tasks/spending/reminders/schedule."""
        print(f"[BACKEND] NLP: {text}")
        lower = text.lower().strip()

        if lower in ["summary", "finance summary"]:
            return self.finance_manager.get_summary()
        if lower in ["tasks", "list tasks"]:
            return self.task_manager.list_tasks()
        if lower == "clear all":
            self.task_manager.clear_all_tasks()
            self.finance_manager.clear_all_transactions()
            return {"status": "success", "message": "All tasks and expenses cleared.", "data": {}}

        existing_titles = [t["title"] for t in self.task_manager.list_tasks().get("data", [])]
        parsed = self.parser.parse(text, existing_task_titles=existing_titles)
        print(f"[BACKEND] Parsed: {parsed}")

        intent = parsed.get("intent", "unknown")
        data   = parsed.get("data", {})

        if intent == "create_task":
            return self.task_manager.create_task(data)
        if intent == "add_transaction":
            data["type"] = data.get("type") or "expense"
            return self.finance_manager.add_transaction(data)
        if intent == "add_reminder":
            return self.reminder_manager.add_reminder(data)
        if intent == "list_reminders":
            return self.reminder_manager.list_reminders()
        if intent == "add_schedule":
            return self.schedule_manager.add_event(data)
        if intent == "list_schedule":
            return self.schedule_manager.list_events()

        return {"status": "error", "message": "I didn't understand that. Try being more specific."}


pilot = LifePilotApp()


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def serve_home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api/init")
async def get_initial_data():
    """Load all data for the frontend on startup."""
    return {
        "tasks":     pilot.task_manager.list_tasks().get("data", []),
        "spending":  pilot.finance_manager.get_transactions().get("data", []),
        "reminders": pilot.reminder_manager.list_reminders().get("data", []),
        "schedule":  pilot.schedule_manager.list_events().get("data", []),
    }


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """Gemini AI chat with full context awareness."""
    reply = pilot.ai_chat_gemini(request.message)
    return JSONResponse({"status": "success", "message": reply})


@app.post("/api/nlp")
async def nlp_endpoint(request: ChatRequest):
    """Gemini NLP parser for tasks, expenses, reminders, events."""
    result = pilot.handle_nlp(request.message)
    return JSONResponse(result)


# Tasks
@app.post("/api/tasks/complete/{task_id}")
async def complete_task(task_id: int):
    result = pilot.task_manager.complete_task(task_id)
    return JSONResponse(result)

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int):
    result = pilot.task_manager.delete_task(task_id)
    return JSONResponse(result)


# Finance
@app.delete("/api/finance/{trans_id}")
async def delete_spending(trans_id: int):
    result = pilot.finance_manager.delete_transaction(trans_id)
    return JSONResponse(result)


# Reminders
@app.post("/api/reminders")
async def add_reminder(req: ReminderRequest):
    result = pilot.reminder_manager.add_reminder({"text": req.text, "remind_at": req.remind_at})
    return JSONResponse(result)

@app.delete("/api/reminders/{reminder_id}")
async def delete_reminder(reminder_id: int):
    result = pilot.reminder_manager.delete_reminder(reminder_id)
    return JSONResponse(result)


# Schedule
@app.post("/api/schedule")
async def add_schedule(req: ScheduleRequest):
    result = pilot.schedule_manager.add_event({
        "title": req.title, "date": req.date,
        "time": req.time, "duration": req.duration, "notes": req.notes
    })
    return JSONResponse(result)

@app.delete("/api/schedule/{event_id}")
async def delete_schedule(event_id: int):
    result = pilot.schedule_manager.delete_event(event_id)
    return JSONResponse(result)


# Voice
@app.post("/voice/listen")
async def voice_listen():
    text = pilot.speech_recognizer.listen()
    if text:
        return JSONResponse({"status": "success", "text": text})
    return JSONResponse({"status": "error", "text": "", "message": "No speech detected."})