# FitFindr — Starter Kit

This starter kit contains everything you need to begin Project 2.

## What's Included

```
ai201-project2-fitfindr-starter/
├── data/
│   ├── listings.json          # 40 mock secondhand listings
│   └── wardrobe_schema.json   # Wardrobe format + example wardrobe
├── utils/
│   └── data_loader.py         # Helper functions for loading the data
├── planning.md                # Your planning template — fill this out first
└── requirements.txt           # Python dependencies
```

## Setup

```bash
pip install -r requirements.txt
```

Set your Groq API key in a `.env` file (get a free key at [console.groq.com](https://console.groq.com)):
```
GROQ_API_KEY=your_key_here
```

## The Mock Listings Dataset

`data/listings.json` contains 40 mock secondhand listings across categories (tops, bottoms, outerwear, shoes, accessories) and styles (vintage, y2k, grunge, cottagecore, streetwear, and more).

Each listing has: `id`, `title`, `description`, `category`, `style_tags`, `size`, `condition`, `price`, `colors`, `brand`, and `platform`.

Load it with:
```python
from utils.data_loader import load_listings
listings = load_listings()
```

## The Wardrobe Schema

`data/wardrobe_schema.json` defines the format your agent uses to represent a user's existing wardrobe. It includes:

- `schema`: field definitions for a wardrobe item
- `example_wardrobe`: a sample wardrobe with 10 items you can use for testing
- `empty_wardrobe`: a starting template for a new user

Load an example wardrobe with:
```python
from utils.data_loader import get_example_wardrobe
wardrobe = get_example_wardrobe()
```

## Where to Start

1. **Read `planning.md` and fill it out before writing any code.**
2. Verify the data loads correctly by running `python utils/data_loader.py`.
3. Build and test each tool individually before connecting them through your planning loop.

Your implementation files go in this same directory. There's no required file structure for your agent code — organize it however makes sense for your design.

---

## FitFindr Agent Documentation

### 1. Tool Inventory & Planning Loop

**Tool Inventory:**
- **`search_listings(description, size, max_price)`**: Searches the mock listings dataset for secondhand items matching the user's criteria. Returns a list of dictionaries of matching items.
- **`suggest_outfit(new_item, wardrobe)`**: Prompts the LLM (llama-3.3-70b-versatile) to generate an outfit suggestion by pairing the newly found item with items from the user's existing wardrobe. Returns a styling suggestion string.
- **`create_fit_card(outfit, new_item)`**: Takes the generated outfit suggestion and creates a short, Instagram-style caption using the LLM. Returns the caption string.
- **`retry_search_with_fallback(original_description, size, max_price)` (Stretch Tool)**: Retries the search with looser constraints if the initial search fails. Returns fallback matching items.

**Planning Loop & State Management:**
The agent orchestrates the tools sequentially and stores data in a shared `session` dictionary. It first parses the user query and calls `search_listings`. If results are found, it grabs the top item and stores it as `session["selected_item"]`. The agent then calls `suggest_outfit` passing the selected item and wardrobe, saving the result to `session["outfit_suggestion"]`. Finally, it passes both the suggestion and selected item to `create_fit_card` and stores the caption in `session["fit_card"]`. The agent avoids blindly calling tools by branching on empty results and early-exiting when necessary.

### 2. Error Handling Strategy

To ensure the agent remains useful during failure modes, error handling is implemented at the tool level:
- **Empty Searches (`search_listings`)**: If no items match the query, the tool returns an empty list. The planning loop detects this, avoids calling subsequent tools, and returns a helpful message explaining the lack of results (or tries the fallback tool).
- **Empty Wardrobes (`suggest_outfit`)**: If the user's wardrobe list is empty, the tool detects this before crafting the prompt. Instead of trying to mix pieces, it instructs the LLM to provide general, versatile styling advice for the single item.
- **Empty Outfit Strings (`create_fit_card`)**: If the outfit suggestion input is empty or missing, the tool intercepts this before making an API call and returns an explicit error string indicating that the caption generation failed, preventing an LLM hallucination or crash.

### 3. Spec Reflection

**Prompt-Engineering Influence (Amatriain):**
This project connects directly to the LLM-agent concepts outlined in Amatriain’s prompt engineering survey. FitFindr utilizes a structured chain/agent approach where the output of one step (e.g., `search_listings`) explicitly becomes the state for the next step (`suggest_outfit`). As noted in the literature, LLMs struggle to maintain reliable state internally over long interactions. By using an explicit `session` dictionary to manage state outside the LLM, FitFindr ensures that context is reliably preserved and passed between isolated tool invocations.

### 4. AI Usage Section

- **Instance 1: Tool Implementations (Milestone 3)**
  I provided the AI with the tool definitions and failure modes from `planning.md`. It generated the Python functions for `search_listings`, `suggest_outfit`, and `create_fit_card` in `tools.py`. I verified the outputs and ensured the fallback logic (e.g., empty wardrobe detection) perfectly matched my specs before integrating.
  
- **Instance 2: Agent Planning Loop (Milestone 4)**
  I supplied the AI with my Mermaid architecture diagram and the planning loop text. The AI drafted the `run_agent()` orchestration function in `agent.py`. I reviewed the drafted code to ensure the conditional branching (exiting early if `search_listings` returned an empty list) was correctly implemented and that state was accurately saved to the `session` dictionary.
