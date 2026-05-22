# -*- coding: utf-8 -*-
import requests
import json

def verify():
    url = "http://127.0.0.1:8000/api/motorcycles"
    print(f"Connecting to {url}...")
    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            print(f"Failed! Status code: {response.status_code}")
            return
            
        data = response.json()
        print(f"Success! Retrieved {len(data)} motorcycles.")
        
        # Verify schema elements
        for index, item in enumerate(data[:3]):
            print(f"\nItem #{index + 1}: {item['brand']} {item['name']}")
            print(f"  Price: {item.get('price')} (Source: {item.get('price_source')})")
            print(f"  Image: {item.get('source_image')}")
            print(f"  URL: {item.get('source_url')}")
            
        # Count sources
        sources = {}
        for item in data:
            src = item.get("price_source", "unknown")
            sources[src] = sources.get(src, 0) + 1
        print(f"\nPrice Sources Breakdown: {sources}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify()
