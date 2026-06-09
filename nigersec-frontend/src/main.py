from pydantic import BaseModel

class NotifyRequest(BaseModel):
    email: str

@app.post("/v1/notify")
def notify(req: NotifyRequest):
    # TODO: save to DB and send verification email
    return {"status": "subscribed", "email": req.email}

@app.get("/v1/citizen/alerts")
def citizen_alerts(user_id: str = "demo"):
    # Return real alerts from DB — demo version for now
    return {"alerts": [
        {"id": 1, "title": "No active alerts", "severity": "SAFE",
         "time": "Just now", "body": "All clear for your monitored identifiers."}
    ]}

@app.get("/v1/citizen/history")
def citizen_history(user_id: str = "demo"):
    return {"history": []}  # Return from DB when available

@app.get("/v1/citizen/summary")
def citizen_summary(user_id: str = "demo"):
    return {"active_alerts": 0, "last_check": "2h ago",
            "risk_level": "SAFE", "breaches_total": 0}