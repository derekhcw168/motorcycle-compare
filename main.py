# -*- coding: utf-8 -*-
import os
import json
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from scraper.momo_scraper import run_scraper
from scraper.base_catalog import MOTORCYCLES_CATALOG

app = FastAPI(
    title="Taiwan Motorcycle Comparison API",
    description="API serving specs and momo prices of mainstream scooters in Taiwan"
)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DATA_FILE = os.path.join(DATA_DIR, "motorcycles.json")
STATIC_DIR = os.path.join(BASE_DIR, "docs")

# Ensure static folder exists
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

def generate_default_data():
    """
    Generate initial data with default MSRP prices if database does not exist
    """
    compiled = []
    import time
    
    official_urls = {
        "SYM 三陽": "https://tw.sym-global.com/",
        "KYMCO 光陽": "https://www.kymco.com.tw/",
        "YAMAHA 山葉": "https://www.yamaha-motor.com.tw/"
    }
    
    for bike in MOTORCYCLES_CATALOG:
        record = bike.copy()
        if "search_keywords" in record:
            del record["search_keywords"]
        
        record["price"] = bike["official_price"]
        record["price_source"] = "official"
        record["source_name"] = "官方建議售價"
        record["source_url"] = official_urls.get(bike["brand"], "https://tw.sym-global.com/")
        record["source_image"] = bike["official_image"]
        record["last_updated"] = time.strftime("%Y-%m-%d %H:%M:%S")
        compiled.append(record)
        
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(compiled, f, ensure_ascii=False, indent=4)
    return compiled

# API Endpoints
@app.get("/api/motorcycles")
def get_motorcycles():
    """
    Get all motorcycle specifications and momo prices
    """
    if not os.path.exists(DATA_FILE):
        return generate_default_data()
    
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read database: {e}")

@app.post("/api/refresh")
def refresh_prices(background_tasks: BackgroundTasks):
    """
    Trigger background task to scrape and update momo prices
    """
    background_tasks.add_task(run_scraper)
    return {"status": "refreshing", "message": "Scraper started in the background. It will take 1-2 minutes to compile all models."}

# Mount the static directory to root "/"
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
