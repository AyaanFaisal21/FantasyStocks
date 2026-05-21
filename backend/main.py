import os
import traceback
from datetime import datetime, timezone as tz
from typing import Optional

from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from stocks import fetch_price
from MatchupCalc import run_weekly_matchups
from stockManagement import Stock, add_stock, remove_stock
from database import get_client
from draft import router as draft_router
from chat import router as chat_router

def get_cors_origins() -> list[str]:
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in origins.split(",") if origin.strip()]

app = FastAPI(
    title="FantasyStocks API",
    version="1.0.0",
    description="Backend API for fantasy stock leagues, drafts, chat, and matchup automation.",
)
app.include_router(draft_router)
app.include_router(chat_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Stock price API is running."}

@app.get("/health", tags=["ops"])
def health_check():
    return {
        "status": "ok",
        "service": "fantasystocks-api",
        "timestamp": datetime.now(tz.utc).isoformat(),
    }

@app.get("/price")
def get_stock_price(ticker: str, ts: Optional[str] = None):
    try:
        ticker = ticker.upper()
        if ts:
            dt = datetime.fromisoformat(ts)
        else:
            dt = datetime.now(tz.utc)

        price_data = fetch_price(ticker, dt)
        return {"price_data": price_data}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/run-matchups")
def run_matchups():
    try:
        run_weekly_matchups()
        return {"message": "Matchup calculations completed successfully."}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/add-stock")
def add_stock_endpoint(stock: Stock):

    print("Adding Stock!")

    try:
        return add_stock(stock)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/remove-stock")
def remove_stock_endpoint(stock: Stock):
    try:
        return remove_stock(stock)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/hasTicker")
def has_ticker(leagueMemberId, ticker):
    try:
        client = get_client()
        existing_stock = client.table("user_stocks").select("*").eq("league_member_id", leagueMemberId).eq("Ticker", ticker).execute().data
        print("Query response:", existing_stock)
        return {"has_ticker": len(existing_stock) > 0}  
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True: 
        data = await websocket.receive_text()
        await websocket.send_text(f"Message text was {data}")
