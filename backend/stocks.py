from time_utils import process_time, get_monday_from_processed
from database import get_client, retrieve_stock, add_entries
from datetime import datetime, timedelta
import os
from config import load_backend_env

from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame

import pandas as pd

load_backend_env()

API_KEY = os.getenv("ALPACA_API_KEY")
API_SECRET = os.getenv("ALPACA_API_SECRET")
TIME_CHUNK_SIZE = int(os.getenv("TIME_CHUNK_SIZE"))

"""
Given a DataFrame with potential gaps in timestamps, returns a dataframe containing only values from time chunk points. 
Fills forward prices to fill missing values. Index is default. timestamps column is of type pd.Timestamp
"""
def fill_forward_prices(data: pd.DataFrame, query_start: datetime, query_end: datetime) -> pd.DataFrame:
    data = data.reset_index().set_index("timestamp")
    full_range = pd.date_range(start= query_start - timedelta(minutes = 30), end=query_end, freq='1min')
    data = data.reindex(full_range).ffill()

    useful_range = pd.date_range(start = query_start, end = query_end, freq = f'{TIME_CHUNK_SIZE}min')
    data = data.loc[useful_range]

    data = data.reset_index(names="timestamp")
    data["trade_count"] = data["trade_count"].astype(int)
    return data

"""
Given a dictionary with a timestamp key which has a pd.Timestamp value, converts the value to iso format.
Returns this dict as well
"""
def convert_data_to_iso(data: dict) -> dict: 
    data['timestamp'] = data['timestamp'].isoformat()
    return data

"""
Given a ticker symbol and the current time, gets the stock price from the most recent time chunk point
Will try to query database first. If data not in database it will query Alpaca and also add data to database 
Returns dict object with keys: ['symbol', 'timestamp', 'open', 'high', 'low', 'close', 'volume', 'trade_count', 'vwap'] 
"""
def fetch_price(ticker: str, ts: datetime) -> dict:
    use_time = process_time(ts)

    db_client = get_client()
    current_data = retrieve_stock(db_client, ticker)

    # Check if already in database
    if current_data is not None:
        search = current_data['timestamp'].isin([use_time])
        if search.any(): 
            return convert_data_to_iso(current_data[search].iloc[0].to_dict())

    # Query Alpaca for data
    query_end = use_time
    query_start = get_monday_from_processed(query_end) # Ensure there is enough room to ensure data exists
    if query_start.weekday() == 0: 
        query_start = query_start - timedelta(days=7)

    alpaca_client = StockHistoricalDataClient(API_KEY, API_SECRET)
    request_params = StockBarsRequest(
        symbol_or_symbols=[ticker],
        start= query_start - timedelta(minutes = 30),
        end= query_end,
        timeframe=TimeFrame.Minute, 
        feed='iex' #defaults to SIP which is paid tier only
    )
    
    bars = alpaca_client.get_stock_bars(request_params)
    if not ticker in bars.data: 
        raise ValueError(f"No price data found for ticker '{ticker}'.")
    
    # Insert into database and return data
    if bars.df.iloc[0].isnull().any():
        raise ValueError(f"Ticker {ticker} is not traded frequently enough.")
    data = fill_forward_prices(bars.df, query_start, query_end)
    add_entries(db_client, data)

    return convert_data_to_iso(data.iloc[-1].to_dict())

    
