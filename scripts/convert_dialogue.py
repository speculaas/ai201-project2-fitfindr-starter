import json
import os
import sys

# Paths
INPUT_FILE = "../docs/dlg-m365-0b04320a_can-you-search-and-summarize-the-difference-iPhone.json"
OUTPUT_FILE = "../docs/new_slide_snippet.json"

MERMAID_CODE = """flowchart-elk TD
    A[User question: Check Google Store / Best Buy / Walmart price match for Prime Day] --> B[Search web for current official price match policies]
    B --> C1[Google Store policy search]
    B --> C2[Best Buy policy search]
    B --> C3[Walmart policy search]
    C1 --> D1[Opened Google Store Help: Request a price match]
    D1 --> E1[Extracted key conditions: selected retail partners, same model/color/storage, live URL, in stock, within return period]
    D1 --> E2[Noted U.S. selected retailers include Amazon sold by Amazon.com, Best Buy, Target, Walmart, B&H, Signifi]
    D1 --> E3[Noted exclusion: members-only pricing excluded except Amazon Prime deals]
    C2 --> D2[Opened Best Buy Price Match Guarantee]
    D2 --> E4[Extracted key conditions: identical new item, immediate availability, qualified competitor]
    D2 --> E5[Noted exclusions: Marketplace sellers, membership-only pricing, special daily/hourly sales, limited promo categories]
    C3 --> D3[Opened Walmart official Help and Corporate FAQ]
    D3 --> E6[Extracted Walmart.com exclusion: no competitor price match, no post-purchase price drops]
    D3 --> E7[Extracted in-store rule: Walmart store can match identical item advertised on Walmart.com only]
    E1 --> F[Compare policy fit for Amazon Prime Day Pixel 10a deal]
    E2 --> F
    E3 --> F
    E4 --> F
    E5 --> F
    E6 --> F
    E7 --> F
    F --> G1[Google Store verdict: likely yes if exact unlocked Pixel 10a and all conditions met]
    F --> G2[Best Buy verdict: normal Amazon public price maybe; Prime-exclusive/Lightning-style deal likely no]
    F --> G3[Walmart verdict: no Amazon competitor match]
    G1 --> H[Practical recommendation: buy where deal is live; use Google Store price match only if already purchased there]
    G2 --> H
    G3 --> H"""

def main():
    input_path = "C:/Users/jimmy/Documents/software/msys64/home/watney/Zimmnotes/chat/codepath/ai201/m1/w2/docs/dlg-m365-0b04320a_can-you-search-and-summarize-the-difference-iPhone.json"
    output_path = "C:/Users/jimmy/Documents/software/msys64/home/watney/Zimmnotes/chat/codepath/ai201/m1/w2/ai201-project2-fitfindr-starter/docs/new_slide_snippet.json"
    
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    turns = data.get("turns", [])
    
    comments = []
    
    for turn in turns:
        question = turn.get("question", "").strip()
        reasoning = turn.get("reasoning", "").strip()
        answer = turn.get("answer", "").strip()
        
        if question:
            comments.append({
                "author": "User",
                "text": question,
                "image_url": ""
            })
            
        if reasoning:
            # Strip out generic "Copilot said:" preambles if present
            reasoning_clean = reasoning.replace("Copilot said:\nCopilot\n", "").strip()
            comments.append({
                "author": "Agent Reasoning",
                "text": "```text\n" + reasoning_clean + "\n```",
                "image_url": ""
            })
            
        if answer:
            comments.append({
                "author": "Agent Answer",
                "text": answer,
                "image_url": ""
            })
            
    slide = {
        "id": "price-match-policies",
        "title": "Agent Research: Price Match Policies for Prime Day",
        "image_filename": "",
        "mermaid_code": MERMAID_CODE,
        "description": "Here is the conversation showing how the agent researched the price matching policies across different major retailers. Click on any comment images to view them in the main window.",
        "comments": comments
    }
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(slide, f, indent=4)
        
    print(f"Generated slide snippet at {output_path}")

if __name__ == "__main__":
    main()
