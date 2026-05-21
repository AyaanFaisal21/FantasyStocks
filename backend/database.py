from supabase import create_client, Client, acreate_client, AsyncClient
import pandas as pd

import os
from config import load_backend_env

load_backend_env()
"""
Get a supabase client
"""
def get_client() -> Client: 
    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("VITE_SUPABASE_ANON_KEY")
    client = create_client(url, key)
    
    return client

"""
Get an async supabase client
"""
async def get_async_client() -> AsyncClient: 
    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("VITE_SUPABASE_ANON_KEY")
    client = await acreate_client(url, key)
    return client
    
"""
Given the ticker, get all of its previous stock data. If the ticker is not in the database, returns None
Note that the timestamp column is of type pd.Timestamp (NOT STR!)
"""
def retrieve_stock(client: Client, ticker: str) -> pd.DataFrame: 
    response = client.table("stock_prices").select("*").eq("symbol", ticker).execute()
    data =  pd.DataFrame(response.data)
    if data.empty: 
        return None
    
    data["timestamp"] = pd.to_datetime(data['timestamp'], utc=True)
    return data

"""
Given a dataframe, insert all its rows that don't already exist into the database. 
Expects index to be default
"""
def add_entries(client: Client, data: pd.DataFrame):
    data = data.copy(deep = False)
    data["timestamp"] = data["timestamp"].astype(str)
    records = data.to_dict(orient="records")

    client.table("stock_prices").upsert(
        records,
        on_conflict="symbol, timestamp",
        ignore_duplicates=True
    ).execute()
    
"""
Delete all entries for stock table
"""
def nuke_stock_table(client: Client): 
    client.table("stock_prices").delete().neq("symbol", "").execute()
