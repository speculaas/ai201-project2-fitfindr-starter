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
    
    parser.add_argument("--nested-output", default="", help="Optional path to output as a standalone nested JSON file instead of appending to data.json.")
    
    args = parser.parse_args()

    # Paths resolution
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    input_path = os.path.abspath(args.input)
    data_path = os.path.join(script_dir, args.data_file)
    
    if not os.path.exists(input_path):
        print(f"Error: Input file not found at {input_path}")
        sys.exit(1)
        
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    turns = data.get("turns", [])
    comments = []
    
    def escape_text(text):
        import re
        if not text: return text
        text = re.sub(r'(?<!\\)<', '&lt;', text)
        text = re.sub(r'(?<!\\)>', '&gt;', text)
        return text
    
    for turn in turns:
        question = escape_text(turn.get("question", "").strip())
        reasoning = escape_text(turn.get("reasoning", "").strip())
        answer = escape_text(turn.get("answer", "").strip())
        
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
        "id": os.path.basename(input_path).split('_')[0],
        "title": args.title,
        "image_filename": args.image,
        "mermaid_code": args.mermaid,
        "description": "Nested conversation thread.",
        "comments": comments
    }
    
    if args.nested_output:
        nested_out = os.path.abspath(args.nested_output)
        with open(nested_out, "w", encoding="utf-8") as f:
            json.dump(slide, f, indent=4)
        print(f"Successfully generated standalone nested thread at {nested_out}")
        return

    if not os.path.exists(data_path):
        print(f"Error: data.json not found at {data_path}")
        sys.exit(1)
        
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
