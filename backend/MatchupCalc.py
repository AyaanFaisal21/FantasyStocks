from fastapi import FastAPI
from fastapi.responses import JSONResponse
import traceback
from datetime import datetime, date
import os
from datetime import timedelta
from config import load_backend_env

# Load environment variables early
load_backend_env()

# Now safely read env vars
API_KEY = os.getenv("ALPACA_API_KEY")
API_SECRET = os.getenv("ALPACA_API_SECRET")
TIME_CHUNK_SIZE = os.getenv("TIME_CHUNK_SIZE")

# Your other imports and constants
from database import get_client, retrieve_stock, add_entries
from stocks import fetch_price

app = FastAPI()

def get_current_week(client):
    today = datetime.today()
    response = client.table("matchups").select("created_date").gte("created_date", today).order("created_date", desc = False).limit(1).execute()
    start_date = datetime.fromisoformat(response.data[0]['created_date'])
    print(f"Start date for current week: {start_date}")
    return ((today - start_date).days // 7) + 1

def fetch_unprocessed_matchups(client, end_time):
    today_str = date.today().isoformat()
    week = get_current_week(client)
    all_matchups = []
    response = client.table("matchups").select("*").order("week", desc=False).is_("winner_id", None).execute()
    print(f"Fetched {len(response.data)} unprocessed matchups for week {week} ending on {today_str}.")

    for matchup in response.data:
        start_date = datetime.fromisoformat(matchup["created_date"]).date()
        week = matchup["week"]
        matchup_release_date = start_date + timedelta(days=7 * (week))
        if matchup_release_date <= date.today():
            all_matchups.append(matchup)
    
    return all_matchups

def weekly_score_calc(client, matchups):
    for matchup in matchups:
        user1_portfolio = client.table("portfolios").select("current_balance", "start_of_week_total").eq("league_member_id", matchup['user1_id']).execute().data[0]
        user2_portfolio = client.table("portfolios").select("current_balance", "start_of_week_total").eq("league_member_id", matchup['user2_id']).execute().data[0]

        user1_score = user1_portfolio["current_balance"]
        user2_score = user2_portfolio["current_balance"]

        user1_start_amount = user1_portfolio["start_of_week_total"]
        user2_start_amount = user2_portfolio["start_of_week_total"]

        user1_stocks = client.table("holdings").select("ticker", "stock_amount").eq("league_member_id", matchup['user1_id']).execute().data
        user2_stocks = client.table("holdings").select("ticker", "stock_amount").eq("league_member_id", matchup['user2_id']).execute().data

        week_number = get_current_week(client)

        for stock in user1_stocks:
            price = (fetch_price(stock['ticker'], datetime.fromisoformat(matchup["created_date"]) + timedelta(days=7 * week_number)))["vwap"]
            user1_score += price * stock['stock_amount']

        for stock in user2_stocks:
            price = (fetch_price(stock['ticker'], datetime.fromisoformat(matchup["created_date"])  + timedelta(days=7 * week_number)))["vwap"]
            user2_score += price * stock['stock_amount']

        user1_score /= user1_start_amount
        user2_score /= user2_start_amount

        winner = matchup['user1_id'] if user1_score > user2_score else matchup['user2_id']

        response = client.table("matchups").update({
            "winner_id": winner,
            "u1_score": user1_score,
            "u2_score": user2_score
        }).eq("id", matchup['id']).execute()
        print("Update response:", response)

        user1_score *= user1_start_amount
        user2_score *= user2_start_amount

        client.table("portfolios").update({
            "start_of_week_total": user1_score
        }).eq("league_member_id", matchup['user1_id']).execute()

        client.table("portfolios").update({
            "start_of_week_total": user2_score
        }).eq("league_member_id", matchup['user2_id']).execute()


    print("All matchups processed successfully.")
    return True

def run_weekly_matchups():
    client = get_client()
    matchups = fetch_unprocessed_matchups(client, datetime.now())
    
    if not matchups:
        print("No unprocessed matchups found.")
        return False
    
    success = weekly_score_calc(client, matchups)
    
    if success:
        print("Weekly matchups processed successfully.")
    else:
        print("Failed to process weekly matchups.")
    
    return success
