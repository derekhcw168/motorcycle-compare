# -*- coding: utf-8 -*-
import os
import re
import sys
import time
import random
import urllib.parse
import json
import requests
from bs4 import BeautifulSoup

# Add parent directory to path so we can import base_catalog
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scraper.base_catalog import MOTORCYCLES_CATALOG

# Paths
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
OUTPUT_FILE = os.path.join(DATA_DIR, "motorcycles.json")

def scrape_momo_price(keyword, brand_name, model_name):
    """
    Search momo mobile page, parse ld+json or window variables, and extract the best matching motorcycle.
    """
    encoded_keyword = urllib.parse.quote(keyword)
    url = f"https://m.momoshop.com.tw/search.momo?searchKeyword={encoded_keyword}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://m.momoshop.com.tw/"
    }
    
    print(f"Scraping momo for: '{keyword}'...")
    try:
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            print(f"  [Momo Error] Received status code {response.status_code}")
            return None
            
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 1. Parse ld+json
        ld_json_tags = soup.find_all("script", type="application/ld+json")
        products = []
        
        for tag in ld_json_tags:
            try:
                data = json.loads(tag.string)
                graph = data.get("@graph", []) if isinstance(data, dict) else []
                if not graph and isinstance(data, list):
                    graph = data
                elif not graph and isinstance(data, dict) and data.get("@type") == "Product":
                    graph = [data]
                
                for item in graph:
                    if item.get("@type") == "ItemList":
                        elements = item.get("itemListElement", [])
                        for elem in elements:
                            if elem.get("@type") == "Product":
                                products.append(elem)
                    elif item.get("@type") == "Product":
                        products.append(item)
            except Exception:
                continue
                
        # 2. Extract from goodsInfoList if ld+json is empty
        if not products:
            match = re.search(r'"goodsInfoList"\s*:\s*(\[[^\]]*\])', response.text)
            if match:
                try:
                    goods_list = json.loads(match.group(1))
                    for g in goods_list:
                        price_str = str(g.get("SALE_PRICE", g.get("goodsPriceOri", "0")))
                        price_val = int(re.sub(r'[^\d]', '', price_str))
                        products.append({
                            "name": g.get("goodsName"),
                            "offers": {
                                "price": price_val,
                                "priceCurrency": "TWD"
                            },
                            "url": g.get("goodsUrl"),
                            "image": g.get("imgUrl")
                        })
                except Exception:
                    pass
                    
        # 3. Filter and score products
        valid_candidates = []
        for p in products:
            name = p.get("name", "")
            offers = p.get("offers", {})
            
            price = 0
            if isinstance(offers, dict):
                price = offers.get("price", 0)
            elif isinstance(offers, list) and len(offers) > 0:
                price = offers[0].get("price", 0)
                
            if isinstance(price, str):
                price = int(re.sub(r'[^\d]', '', price))
            else:
                price = int(price or 0)
                
            # Filter criteria:
            if price < 30000 or price > 250000:
                continue
                
            # Exclude obvious accessories
            exclude_keywords = ["補漆", "靠背", "置物架", "腳踏", "機油", "輪胎", "改裝", "行車紀錄器", "車套", "貼紙", "防刮", "地毯"]
            if any(k in name for k in exclude_keywords):
                continue
                
            # Score candidate based on keyword matches
            score = 0
            # Brand match
            brand_clean = brand_name.lower()
            brand_parts = ["sym", "三陽", "kymco", "光陽", "yamaha", "山葉"]
            for bp in brand_parts:
                if bp in brand_clean and bp in name.lower():
                    score += 10
            
            # Model name match
            model_parts = model_name.lower().split()
            for part in model_parts:
                if len(part) >= 2 and part in name.lower():
                    score += 15
            
            # Displacement check
            if "125" in name and "125" in keyword:
                score += 5
            if "150" in name and "150" in keyword:
                score += 5
            if "158" in name and "158" in keyword:
                score += 5
            if "155" in name and "155" in keyword:
                score += 5
                
            valid_candidates.append({
                "name": name,
                "price": price,
                "url": p.get("url", f"https://www.momoshop.com.tw/search/searchShop.jsp?keyword={encoded_keyword}"),
                "image": p.get("image", ""),
                "score": score
            })
            
        if not valid_candidates:
            print(f"  [Momo Warning] No valid motorcycle found for: {keyword}")
            return None
            
        # Sort by score desc, price asc
        valid_candidates.sort(key=lambda x: (-x["score"], x["price"]))
        best = valid_candidates[0]
        
        momo_url = best["url"].strip()
        if momo_url.startswith("//"):
            momo_url = "https:" + momo_url
        elif momo_url.startswith("/"):
            momo_url = "https://m.momoshop.com.tw" + momo_url
            
        momo_image = best["image"].strip()
        if momo_image.startswith("//"):
            momo_image = "https:" + momo_image
            
        print(f"  [Momo Success] Matched: {best['name']} | Price: NT$ {best['price']:,}")
        
        return {
            "price": best["price"],
            "price_source": "momo",
            "source_name": "momo 購物網",
            "source_url": momo_url,
            "source_image": momo_image
        }
        
    except Exception as e:
        print(f"  [Momo Error] Failed scraping: {e}")
        return None

def scrape_shopee_price_via_feebee(keyword, brand_name, model_name):
    """
    Search Feebee to find Shopee Taiwan motorcycle prices.
    """
    encoded_keyword = urllib.parse.quote(keyword)
    url = f"https://feebee.com.tw/s/?q={encoded_keyword}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://feebee.com.tw/"
    }
    
    print(f"Scraping Feebee (Shopee fallback) for: '{keyword}'...")
    try:
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            print(f"  [Feebee Error] Received status code {response.status_code}")
            return None
            
        soup = BeautifulSoup(response.text, 'html.parser')
        items = soup.find_all("li", class_=lambda x: x and "items" in x)
        if not items:
            items = soup.find_all("div", class_=lambda x: x and "item" in x)
            
        valid_candidates = []
        for item in items:
            # 1. Shop check - must be Shopee (蝦皮)
            shop_tag = item.find(class_=lambda x: x and "shop" in x) or item.find(class_=lambda x: x and "source" in x)
            shop = shop_tag.text.strip() if shop_tag else ""
            if "蝦皮" not in shop:
                continue
                
            # 2. Title
            title_tag = item.find("h3") or item.find("h2") or item.find(class_=lambda x: x and "title" in x)
            title = title_tag.text.strip() if title_tag else ""
            
            # 3. Price
            price_tag = item.find(class_=lambda x: x and "price" in x)
            price_text = price_tag.text.strip() if price_tag else "0"
            price_val = int(re.sub(r'[^\d]', '', price_text)) if price_text else 0
            
            # Filter criteria:
            if price_val < 30000 or price_val > 250000:
                continue
                
            # Exclude obvious accessories
            exclude_keywords = ["補漆", "靠背", "置物架", "腳踏", "機油", "輪胎", "改裝", "行車紀錄器", "車套", "貼紙", "防刮", "地毯", "模型", "玩具", "樂高"]
            if any(k in title for k in exclude_keywords):
                continue
                
            # 4. Link
            link_tag = item.find("a")
            link = ""
            if link_tag and link_tag.has_attr("href"):
                link = link_tag["href"]
                if link.startswith("/"):
                    link = "https://feebee.com.tw" + link
                    
            # 5. Image
            img_tag = item.find("img")
            img_url = ""
            if img_tag:
                img_url = img_tag.get("src", img_tag.get("data-src", ""))
                
            # Score candidate based on keyword matches
            score = 0
            # Brand match
            brand_clean = brand_name.lower()
            brand_parts = ["sym", "三陽", "kymco", "光陽", "yamaha", "山葉"]
            for bp in brand_parts:
                if bp in brand_clean and bp in title.lower():
                    score += 10
            
            # Model name match
            model_parts = model_name.lower().split()
            for part in model_parts:
                if len(part) >= 2 and part in title.lower():
                    score += 15
            
            # Displacement check
            if "125" in title and "125" in keyword:
                score += 5
            if "150" in title and "150" in keyword:
                score += 5
            if "158" in title and "158" in keyword:
                score += 5
            if "155" in title and "155" in keyword:
                score += 5
                
            valid_candidates.append({
                "name": title,
                "price": price_val,
                "shop": shop,
                "url": link,
                "image": img_url,
                "score": score
            })
            
        if not valid_candidates:
            print(f"  [Feebee Warning] No valid Shopee items found on Feebee for: {keyword}")
            return None
            
        # Sort by score desc, price asc
        valid_candidates.sort(key=lambda x: (-x["score"], x["price"]))
        best = valid_candidates[0]
        
        print(f"  [Feebee Success] Matched: {best['name']} | Price: NT$ {best['price']:,} ({best['shop']})")
        
        return {
            "price": best["price"],
            "price_source": "shopee",
            "source_name": best["shop"],
            "source_url": best["url"],
            "source_image": best["image"]
        }
        
    except Exception as e:
        print(f"  [Feebee Error] Failed scraping: {e}")
        return None

def run_scraper():
    """
    Run scraper for all catalog items and compile to motorcycles.json with Momo -> Shopee -> Official Fallback logic.
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    
    compiled_data = []
    
    # Read existing database to keep fallback values if scrape fails (avoids reverting to MSRP on network hiccup)
    existing_db = {}
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                items = json.load(f)
                existing_db = {item["id"]: item for item in items}
        except Exception:
            pass
            
    print(f"Starting Motorcycle Price Scraper ({len(MOTORCYCLES_CATALOG)} models)...")
    for index, bike in enumerate(MOTORCYCLES_CATALOG):
        print(f"\n[{index + 1}/{len(MOTORCYCLES_CATALOG)}] Processing {bike['brand']} {bike['name']}...")
        price_info = None
        
        # 1. Try Momo Scraping
        for kw in bike["search_keywords"]:
            price_info = scrape_momo_price(kw, bike["brand"], bike["name"])
            if price_info:
                break
            time.sleep(random.uniform(1.0, 2.0))
            
        # 2. Try Shopee (via Feebee) Scraping if Momo fails
        if not price_info:
            print(f"  --> Momo failed. Trying Shopee fallback...")
            for kw in bike["search_keywords"]:
                price_info = scrape_shopee_price_via_feebee(kw, bike["brand"], bike["name"])
                if price_info:
                    break
                time.sleep(random.uniform(1.0, 2.0))
                
        # Compile record
        record = bike.copy()
        if "search_keywords" in record:
            del record["search_keywords"]
            
        if price_info:
            # Successfully scraped price (either Momo or Shopee)
            record.update(price_info)
            record["last_updated"] = time.strftime("%Y-%m-%d %H:%M:%S")
        else:
            # 3. Fallback to existing database (Momo/Shopee values from previous successful runs)
            if bike["id"] in existing_db and existing_db[bike["id"]].get("price_source") in ["momo", "shopee"]:
                print(f"  [Fallback] Using previous scraped database records for {bike['name']}")
                prev = existing_db[bike["id"]]
                record["price"] = prev.get("price", bike["official_price"])
                record["price_source"] = prev.get("price_source", "official")
                record["source_name"] = prev.get("source_name", "官方建議售價")
                record["source_url"] = prev.get("source_url", "")
                record["source_image"] = prev.get("source_image", bike["official_image"])
                record["last_updated"] = prev.get("last_updated", time.strftime("%Y-%m-%d %H:%M:%S"))
            else:
                # 4. Fallback to Official MSRP Price
                print(f"  [Official Fallback] Reverting to Official MSRP price for {bike['name']}")
                
                # Brand default official site urls
                official_urls = {
                    "SYM 三陽": "https://tw.sym-global.com/",
                    "KYMCO 光陽": "https://www.kymco.com.tw/",
                    "YAMAHA 山葉": "https://www.yamaha-motor.com.tw/"
                }
                
                record["price"] = bike["official_price"]
                record["price_source"] = "official"
                record["source_name"] = "官方建議售價"
                record["source_url"] = official_urls.get(bike["brand"], "https://tw.sym-global.com/")
                record["source_image"] = bike["official_image"]
                record["last_updated"] = time.strftime("%Y-%m-%d %H:%M:%S")
                
        compiled_data.append(record)
        # Extra delay between models to respect websites' rate limits
        time.sleep(random.uniform(2.0, 4.0))
        
    # Write to JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(compiled_data, f, ensure_ascii=False, indent=4)
        
    print(f"\nData compilation finished. Saved {len(compiled_data)} models to: {OUTPUT_FILE}")
    return compiled_data

if __name__ == "__main__":
    run_scraper()
