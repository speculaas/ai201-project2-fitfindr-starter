import pytest
from tools import search_listings, suggest_outfit, create_fit_card

def test_search_returns_results():
    results = search_listings("vintage graphic tee", size=None, max_price=50)
    assert isinstance(results, list)
    assert len(results) > 0

def test_search_empty_results():
    results = search_listings("designer ballgown", size="XXS", max_price=5)
    assert results == []   # empty list, no exception

def test_search_price_filter():
    results = search_listings("jacket", size=None, max_price=10)
    assert all(item["price"] <= 10 for item in results)

def test_search_size_filter():
    results = search_listings("pants", size="M")
    assert all(item["size"].upper() == "M" for item in results if "size" in item)

def test_suggest_outfit_empty_wardrobe():
    results = search_listings("vintage graphic tee", size=None, max_price=50)
    item = results[0] if results else {"title": "Test Tee", "description": "A test tee"}
    outfit = suggest_outfit(item, {"items": []})
    assert isinstance(outfit, str)
    assert len(outfit) > 0
    # Note: Groq API key must be set for this to pass

def test_create_fit_card_empty_outfit():
    results = search_listings("vintage graphic tee", size=None, max_price=50)
    item = results[0] if results else {"title": "Test Tee", "price": 20}
    card = create_fit_card("", item)
    assert "Error:" in card
