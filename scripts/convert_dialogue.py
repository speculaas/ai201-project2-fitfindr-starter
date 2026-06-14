import json
import os
import argparse
import sys

def main():
    parser = argparse.ArgumentParser(description="Convert a Copilot dialogue JSON to a gallery slide.")
    parser.add_argument("--input", required=True, help="Path to the input JSON dialogue file.")
    parser.add_argument("--title", required=True, help="Title of the new slide.")
    parser.add_argument("--mermaid", default="", help="Optional mermaid code for the diagram.")
    parser.add_argument("--image", default="", help="Optional URL or path for a main viewport image.")
    parser.add_argument("--data-file", default="../docs/data.json", help="Path to the gallery data.json to append to.")
    
    args = parser.parse_args()

    # Paths resolution
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    input_path = os.path.abspath(args.input)
    data_path = os.path.join(script_dir, args.data_file)
    
    if not os.path.exists(input_path):
        print(f"Error: Input file not found at {input_path}")
        sys.exit(1)
        
    if not os.path.exists(data_path):
        print(f"Error: data.json not found at {data_path}")
        sys.exit(1)
    
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
        "id": os.path.basename(input_path).split('_')[0], # Use first part of filename as ID
        "title": args.title,
        "image_filename": args.image,
        "mermaid_code": args.mermaid,
        "description": "Conversation extracted via conversion script. Click on any comment images to view them in the main window.",
        "comments": comments
    }
    
    # Read existing data.json
    with open(data_path, "r", encoding="utf-8") as f:
        gallery_data = json.load(f)
        
    # Append the new slide
    gallery_data.append(slide)
    
    # Write it back
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(gallery_data, f, indent=4)
        
    print(f"Successfully appended slide '{args.title}' to {data_path}")

if __name__ == "__main__":
    main()
