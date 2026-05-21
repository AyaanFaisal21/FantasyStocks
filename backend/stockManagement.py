from fastapi import FastAPI
from fastapi.responses import JSONResponse
import os
from pydantic import BaseModel
from config import load_backend_env

# Load environment variables early
load_backend_env()

# Now safely read env vars
API_KEY = os.getenv("ALPACA_API_KEY")
API_SECRET = os.getenv("ALPACA_API_SECRET")

# Your other imports and constants
from database import get_client

app = FastAPI()

class Stock(BaseModel):
    league_member_id: str
    league_id: str
    ticker: str

def add_stock(data: Stock):
    client = get_client()
    print("Adding Stock!")
    existing_stock = client.table("user_stocks").select("*").eq("league_id", data.league_id).eq("Ticker", data.ticker).execute().data
    
    if(existing_stock):
        return JSONResponse(status_code=400, content={"message": "Stock already exists in the league."})
    response = client.table("user_stocks").insert({
        "league_id": data.league_id,
        "Ticker": data.ticker,
        "league_member_id": data.league_member_id
    }).execute()

    return {"message": "Stock added successfully.", "data": response.data}

def remove_stock(data: Stock):
    client = get_client()
    existing_stock = client.table("user_stocks").select("*").eq("league_member_id", data.league_member_id).eq("Ticker", data.ticker).execute().data
    
    if not existing_stock or len(existing_stock) == 0:
        return JSONResponse(status_code=404, content={"message": "You do not own this stock."})
    
    client.table("user_stocks").delete().eq("league_id", data.league_id).eq("Ticker", data.ticker).eq("league_member_id", data.league_member_id).execute()

    return {"message": "Stock removed successfully."}
