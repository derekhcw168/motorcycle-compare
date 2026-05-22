# -*- coding: utf-8 -*-
import requests

def verify_static():
    base_url = "http://127.0.0.1:8000"
    paths = [
        "/",
        "/index.css",
        "/index.js",
        "/data/motorcycles.json"
    ]
    
    print("=== Testing FastAPI Local Static Hosting ===")
    all_ok = True
    for path in paths:
        url = base_url + path
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print(f"[OK]  {path} -> Status: 200 (Length: {len(response.content)})")
            else:
                print(f"[ERR] {path} -> Status: {response.status_code}")
                all_ok = False
        except Exception as e:
            print(f"[ERR] {path} -> Failed to connect: {e}")
            all_ok = False
            
    if all_ok:
        print("\nAll endpoints are hosting successfully! SPA is ready to publish.")
    else:
        print("\nSome endpoints failed! Please verify FastAPI server status.")

if __name__ == "__main__":
    verify_static()
