import os
import requests
import sys
import json

def think(content):
    invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
    api_key = os.getenv("NVIDIA_API_KEY")
    
    if not api_key:
        return "Error: NVIDIA_API_KEY environment variable not set."

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json"
    }

    payload = {
        "model": "moonshotai/kimi-k2.5",
        "messages": [
            {"role": "system", "content": "You are a senior software engineer specializing in .NET 10, React 19, and DDD. Your task is to perform 'deep thinking' to identify potential build errors, missing namespaces, or architectural violations in code changes."},
            {"role": "user", "content": content}
        ],
        "max_tokens": 16300,
        "temperature": 0.1, # Lower temperature for reasoning
        "top_p": 1.0,
        "stream": False,
        "chat_template_kwargs": {"thinking": True},
    }

    try:
        response = requests.post(invoke_url, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        result = response.json()
        return result['choices'][0]['message']['content']
    except Exception as e:
        return f"Error executing AI reasoning: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 think.py '<content_for_analysis>'")
        sys.exit(1)
    
    input_text = sys.argv[1]
    print(think(input_text))
