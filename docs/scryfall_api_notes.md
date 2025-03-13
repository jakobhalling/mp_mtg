# Scryfall API Integration Notes

## Card Image Endpoints

Scryfall provides multiple image formats and sizes for each card:

| Format | Size | Type | Description | Use Case |
|--------|------|------|-------------|----------|
| `png` | 745 × 1040 | PNG | Transparent, rounded full card | High-quality display for zoomed view |
| `border_crop` | 480 × 680 | JPG | Full card with border cropped | Alternative display option |
| `art_crop` | Varies | JPG | Card art only | Potential UI element |
| `large` | 672 × 936 | JPG | Large full card | Alternative zoomed view |
| `normal` | 488 × 680 | JPG | Medium-sized full card | Standard card display |
| `small` | 146 × 204 | JPG | Small full card | Thumbnails for hand/board |

## Accessing Card Images

To get card images, we need to:

1. First fetch card data using one of these endpoints:
   - `/cards/search` - Search for cards by name, type, etc.
   - `/cards/named` - Get a specific card by exact name
   - `/cards/collection` - Get multiple specific cards
   - `/cards/random` - Get a random card

2. From the card object response, access the `image_uris` property which contains URLs for all image formats.

3. For multi-faced cards (split, flip, transform, etc.), the images are in the `card_faces[].image_uris` properties.

## Example Card Object Structure (simplified)

```json
{
  "id": "unique-card-id",
  "name": "Card Name",
  "image_uris": {
    "small": "https://cards.scryfall.io/small/front/a/b/card-id.jpg",
    "normal": "https://cards.scryfall.io/normal/front/a/b/card-id.jpg",
    "large": "https://cards.scryfall.io/large/front/a/b/card-id.jpg",
    "png": "https://cards.scryfall.io/png/front/a/b/card-id.png",
    "art_crop": "https://cards.scryfall.io/art_crop/front/a/b/card-id.jpg",
    "border_crop": "https://cards.scryfall.io/border_crop/front/a/b/card-id.jpg"
  },
  "card_faces": [
    {
      "name": "Front Face Name",
      "image_uris": {
        "small": "https://cards.scryfall.io/small/front/a/b/card-id.jpg",
        "normal": "https://cards.scryfall.io/normal/front/a/b/card-id.jpg",
        "large": "https://cards.scryfall.io/large/front/a/b/card-id.jpg",
        "png": "https://cards.scryfall.io/png/front/a/b/card-id.png",
        "art_crop": "https://cards.scryfall.io/art_crop/front/a/b/card-id.jpg",
        "border_crop": "https://cards.scryfall.io/border_crop/front/a/b/card-id.jpg"
      }
    },
    {
      "name": "Back Face Name",
      "image_uris": {
        "small": "https://cards.scryfall.io/small/back/a/b/card-id.jpg",
        "normal": "https://cards.scryfall.io/normal/back/a/b/card-id.jpg",
        "large": "https://cards.scryfall.io/large/back/a/b/card-id.jpg",
        "png": "https://cards.scryfall.io/png/back/a/b/card-id.png",
        "art_crop": "https://cards.scryfall.io/art_crop/back/a/b/card-id.jpg",
        "border_crop": "https://cards.scryfall.io/border_crop/back/a/b/card-id.jpg"
      }
    }
  ]
}
```

## Implementation Plan for Card Hover Feature

1. Use `normal` size for cards displayed on the battlefield
2. Use `small` size for cards in hand/thumbnails
3. When hovering over a card:
   - Display the `large` or `png` version in a popup/modal
   - Fetch and display the updated Scryfall text below the image
   - Position the popup to avoid going off-screen

4. Cache fetched card data to minimize API calls

## API Rate Limits

Scryfall API has rate limits that we need to respect:
- Delay between requests: 50-100ms
- Maximum requests per day: Not explicitly stated, but should be used responsibly

## Deck Import Considerations

When importing decks in plain text format ("amount Card Name"), we'll need to:
1. Parse the text input
2. Search for each card by name using `/cards/named` endpoint
3. Store the card data and images for use in the game
