import requests
import time
import json
import webbrowser

# Cleaned up URLs (removed backticks and spaces)
API_URL = "https://ai.gitee.com/v1/async/audio/speech"
API_TOKEN = "ZZIGSINNUET0SIPCUUWGOIIZEFEDVU3QHH0V5Q1D"
headers = {
    "Authorization": f"Bearer {API_TOKEN}"
}

def query(payload):
    print(f"Submitting to {API_URL}...")
    try:
        response = requests.post(API_URL, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Submission failed: {e}")
        if 'response' in locals():
            print(f"Response: {response.text}")
        return {}

def poll_task(task_id):
    # The user's script used 'task' (singular). Let's test this.
    status_url = f"https://ai.gitee.com/v1/task/{task_id}"
    print(f"Polling URL: {status_url}")
    
    timeout = 30 * 60
    retry_interval = 2
    attempts = 0
    max_attempts = int(timeout / retry_interval)
    
    while attempts < max_attempts:
        attempts += 1
        print(f"Checking task status [{attempts}]...", end="")
        try:
            response = requests.get(status_url, headers=headers, timeout=10)
            if response.status_code == 404:
                print(" 404 Not Found (Task ID invalid or endpoint wrong)")
                # Optional: Try plural 'tasks' if singular fails, to debug
                status_url_plural = f"https://ai.gitee.com/v1/tasks/{task_id}"
                print(f"  -> Retrying with plural: {status_url_plural}")
                response = requests.get(status_url_plural, headers=headers, timeout=10)
                if response.status_code == 200:
                    print("  -> Plural 'tasks' endpoint worked!")
                    status_url = status_url_plural # Switch to plural for future loops
            
            result = response.json()
        except Exception as e:
            print(f" Request failed: {e}")
            time.sleep(retry_interval)
            continue

        if result.get("error"):
            print('error')
            raise ValueError(f"{result['error']}: {result.get('message', 'Unknown error')}")
        
        status = result.get("status", "unknown")
        print(f" {status}")
        
        if status == "success":
            if "output" in result and "file_url" in result["output"]:
                file_url = result["output"]["file_url"]
                duration = (result.get('completed_at', 0) - result.get('started_at', 0)) / 1000
                print(f"🔗 Download link: {file_url}")
                print(f"⏱️ Task duration: {duration:.2f} seconds")
            elif "output" in result and "text_result" in result["output"]:
                print(f"📝 Text result: {result['output']['text_result']}")
            else:
                print("⚠️ No output URL found")
            return result
        elif status in ["failed", "cancelled"]:
            print(f"❌ Task {status}")
            return result
        else:
            time.sleep(retry_interval)
            continue
            
    print(f"⏰ Maximum attempts reached ({max_attempts})")
    return {"status": "timeout", "message": "maximum wait time exceeded"}

if __name__ == "__main__":
    print("Creating task...")
    result = query({
        "inputs": "我知道自己不是一个人在战斗，有大家的支持和协作，我相信我们一定能一起把事情做好。他的爱像秋天的阳光，看似清冷，却总能在我最需要的时候给予温暖",
        "model": "IndexTTS-2",
        "prompt_audio_url": "https://gitee.com/gitee-ai/moark-assets/raw/master/jay_prompt.wav",
        "prompt_text": "对我来讲是一种荣幸，但是也是压力蛮大的。不过我觉得是一种呃很好的一个挑战。",
        "emo_text": "你吓死我了！你是鬼吗？",
        "use_emo_text": True
    })
    
    task_id = result.get("task_id")
    if not task_id:
        print("Task ID not found in the response")
    else:
        print(f"Task ID: {task_id}")
        poll_task(task_id)
