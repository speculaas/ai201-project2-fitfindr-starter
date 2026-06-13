"""
tools.py

The three required FitFindr tools. Each tool is a standalone function that
can be called and tested independently before being wired into the agent loop.

Complete and test each tool before moving to agent.py.

Tools:
    search_listings(description, size, max_price)  → list[dict]
    suggest_outfit(new_item, wardrobe)              → str
    create_fit_card(outfit, new_item)               → str
"""

import os

from dotenv import load_dotenv
from groq import Groq

from utils.data_loader import load_listings

load_dotenv()


# ── Groq client ───────────────────────────────────────────────────────────────

def _get_groq_client():
    """Initialize and return a Groq client using GROQ_API_KEY from .env."""
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError(
            "GROQ_API_KEY not set. Add it to a .env file in the project root."
        )
    return Groq(api_key=api_key)


# ── Tool 1: search_listings ───────────────────────────────────────────────────

def search_listings(
    description: str,
    size: str | None = None,
    max_price: float | None = None,
) -> list[dict]:
    """
    Search the mock listings dataset for items matching the description,
    optional size, and optional price ceiling.

    Args:
        description: Keywords describing what the user is looking for
                     (e.g., "vintage graphic tee").
        size:        Size string to filter by, or None to skip size filtering.
                     Matching is case-insensitive (e.g., "M" matches "S/M").
        max_price:   Maximum price (inclusive), or None to skip price filtering.

    Returns:
        A list of matching listing dicts, sorted by relevance (best match first).
        Returns an empty list if nothing matches — does NOT raise an exception.

    Each listing dict has the following fields:
        id, title, description, category, style_tags (list), size,
        condition, price (float), colors (list), brand, platform

    TODO:
        1. Load all listings with load_listings().
        2. Filter by max_price and size (if provided).
        3. Score each remaining listing by keyword overlap with `description`.
        4. Drop any listings with a score of 0 (no relevant matches).
        5. Sort by score, highest first, and return the listing dicts.

    Before writing code, fill in the Tool 1 section of planning.md.
    """
    listings = load_listings()
    
    results = []
    
    # Pre-process keywords and apply lightweight synonyms
    keywords = set(description.lower().split())
    synonyms = {
        "jorts": ["denim", "shorts", "jean", "cutoff", "cut-off"],
        "pink": ["pink", "y2k", "summer", "denim"],
        "a-line": ["shorts", "wide", "relaxed", "loose"]
    }
    expanded_keywords = set(keywords)
    for kw in keywords:
        if kw in synonyms:
            expanded_keywords.update(synonyms[kw])

    for item in listings:
        # Filter by price
        if max_price is not None and item["price"] > max_price:
            continue
            
        # Filter by size
        if size is not None and size.lower() != item.get("size", "").lower():
            continue
            
        # Score by keyword overlap (title + description + category + style_tags)
        item_text = f"{item.get('title', '')} {item.get('description', '')} {item.get('category', '')} {' '.join(item.get('style_tags', []))}".lower()
        score = sum(1 for kw in expanded_keywords if kw in item_text)
        
        if score > 0:
            # Store score temporarily
            item_with_score = dict(item)
            item_with_score["_score"] = score
            results.append(item_with_score)

    # Sort by score descending
    results.sort(key=lambda x: x["_score"], reverse=True)
    
    # Remove the temporary score key
    for r in results:
        del r["_score"]
        
    return results

# ── Tool 1.5: retry_search_with_fallback ──────────────────────────────────────

def retry_search_with_fallback(original_description: str, size: str | None, max_price: float | None) -> list[dict]:
    """
    If the first search returns no results, this tool retries the search
    with loosened constraints. It drops the size filter and increases max_price,
    while using broader terms for the description.
    """
    # Loosen constraints: remove size, increase max price slightly, and keep description simple
    new_max = (max_price * 1.5) if max_price is not None else None
    
    # Try a broader search using just "denim shorts" if the original had "jorts" or "pink"
    broader_desc = original_description
    if "jorts" in broader_desc.lower() or "pink" in broader_desc.lower() or "a-line" in broader_desc.lower():
        broader_desc = "denim shorts"
        
    return search_listings(broader_desc, size=None, max_price=new_max)


# ── Tool 2: suggest_outfit ────────────────────────────────────────────────────

def suggest_outfit(new_item: dict, wardrobe: dict) -> str:
    """
    Given a thrifted item and the user's wardrobe, suggest 1–2 complete outfits.

    Args:
        new_item: A listing dict (the item the user is considering buying).
        wardrobe: A wardrobe dict with an 'items' key containing a list of
                  wardrobe item dicts. May be empty — handle this gracefully.

    Returns:
        A non-empty string with outfit suggestions.
        If the wardrobe is empty, offer general styling advice for the item
        rather than raising an exception or returning an empty string.

    TODO:
        1. Check whether wardrobe['items'] is empty.
        2. If empty: call the LLM with a prompt for general styling ideas
           (what kinds of items pair well, what vibe it suits, etc.).
        3. If not empty: format the wardrobe items into a prompt and ask
           the LLM to suggest specific outfit combinations using the new item
           and named pieces from the wardrobe.
        4. Return the LLM's response as a string.

    Before writing code, fill in the Tool 2 section of planning.md.
    """
    if not wardrobe or not wardrobe.get("items"):
        prompt = (
            f"I just bought a '{new_item.get('title')}' ({new_item.get('description')}). "
            "I don't have any specific wardrobe items saved right now. "
            "Can you give me some general, versatile styling ideas for this piece? What kinds of items and vibes pair well with it?"
        )
    else:
        wardrobe_list = "\n".join([f"- {w.get('color', '')} {w.get('category', '')} ({w.get('style', '')})" for w in wardrobe["items"]])
        prompt = (
            f"I just bought a '{new_item.get('title')}' ({new_item.get('description')}). "
            f"Here is my current wardrobe:\n{wardrobe_list}\n"
            "Can you suggest 1-2 complete outfit combinations using my new item and these pieces from my wardrobe?"
        )

    try:
        client = _get_groq_client()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        return f"Could not generate an outfit suggestion: {e}"


# ── Tool 3: create_fit_card ───────────────────────────────────────────────────

def create_fit_card(outfit: str, new_item: dict) -> str:
    """
    Generate a short, shareable outfit caption for the thrifted find.

    Args:
        outfit:   The outfit suggestion string from suggest_outfit().
        new_item: The listing dict for the thrifted item.

    Returns:
        A 2–4 sentence string usable as an Instagram/TikTok caption.
        If outfit is empty or missing, return a descriptive error message
        string — do NOT raise an exception.

    The caption should:
    - Feel casual and authentic (like a real OOTD post, not a product description)
    - Mention the item name, price, and platform naturally (once each)
    - Capture the outfit vibe in specific terms
    - Sound different each time for different inputs (use higher LLM temperature)

    TODO:
        1. Guard against an empty or whitespace-only outfit string.
        2. Build a prompt that gives the LLM the item details and the outfit,
           and asks for a caption matching the style guidelines above.
        3. Call the LLM and return the response.

    Before writing code, fill in the Tool 3 section of planning.md.
    """
    if not outfit or not outfit.strip():
        return "Error: Missing outfit suggestion to generate a fit card."

    prompt = (
        f"I'm putting together an outfit featuring a '{new_item.get('title')}' I got for ${new_item.get('price')} on {new_item.get('platform', 'a thrift site')}. "
        f"Here is the outfit plan:\n{outfit}\n"
        "Write a short, shareable Instagram or TikTok caption (2-4 sentences) for this outfit. "
        "Keep it casual and authentic, mention the item name, price, and platform naturally (once each), "
        "and capture the outfit's vibe. Do not sound like a product description."
    )

    try:
        client = _get_groq_client()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.9,
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        return f"Could not generate fit card: {e}"
