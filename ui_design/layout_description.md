# MTG Multiplayer Online Game - UI Layout Design

## Overview

This document outlines the user interface layout for the MTG multiplayer online game, focusing on the game board view that supports 2-4 players. The design follows a flat 2D representation with the player's own board on the lower half of the screen and opponents' boards on the upper half.

## Core Layout Principles

1. **Player-Centric View**: The player's own board is always positioned at the bottom of the screen for easy access and visibility
2. **Opponent Visibility**: All opponents are visible simultaneously in the upper portion of the screen
3. **Focused Interaction**: Ability to zoom in on a specific opponent's board while maintaining awareness of other players
4. **Responsive Design**: Layout adapts based on the number of players (2, 3, or 4)
5. **Zone Visibility**: All game zones are visible for all players

## Screen Regions

### Player's Board (Lower Half)
- Takes approximately 50% of the screen height
- Full width of the screen
- Contains all player's game zones:
  - Battlefield (largest area)
  - Hand (along bottom edge)
  - Library, Graveyard, Exile (side areas)
  - Command Zone (if playing Commander format)

### Opponents' Boards (Upper Half)
- Takes approximately 50% of the screen height
- Divided horizontally based on number of opponents:
  - 1 opponent: Full width
  - 2 opponents: Split into two equal sections
  - 3 opponents: Split into three equal sections
- Each opponent section contains:
  - Battlefield (main area)
  - Simplified hand representation (card count icon)
  - Minimized zones (library, graveyard, exile)

### Zoom View
- When clicking on an opponent's board, it expands to fill the entire upper half
- Other opponents' boards are minimized to thumbnails along the top edge
- Clicking a thumbnail switches the zoom focus to that opponent

## Game Zones Layout

### Battlefield
- Central area of each player's section
- Cards are placed in a grid-like pattern
- Supports grouping of related cards (e.g., creatures with equipment attached)

### Hand
- For player: Cards displayed along bottom edge, slightly fanned
- For opponents: Simplified as an icon with card count

### Library
- Represented as a stack in the corner of each player's section
- Shows card back with count indicator

### Graveyard
- Accessible via a stack in the corner
- Clicking opens a scrollable list of cards

### Exile
- Similar to graveyard but in a different corner
- Visually distinct to differentiate from other zones

### Command Zone
- Small area for commander card(s)
- Visually distinct from other zones

## Card Interaction

### Card Display
- Cards on battlefield shown at readable size
- Cards in hand shown at full size for player, hidden for opponents
- Hovering over any card shows larger version with Scryfall text

### Card Manipulation
- Drag and drop for moving cards between zones
- CTRL+click for selecting multiple cards
- Context menu for additional actions

## Player Information

### Life Counter
- Prominently displayed for each player
- Easy to adjust with +/- buttons

### Player Identification
- Name and avatar displayed for each player
- Visual indicator for active player

### Game Phase Indicator
- Clear display of current game phase
- Visual cues for priority

## Layout Adaptations

### 2-Player Layout
```
+---------------------------+
|                           |
|       Opponent 1          |
|                           |
+---------------------------+
|                           |
|         Player            |
|                           |
+---------------------------+
```

### 3-Player Layout
```
+-------------+-------------+
|             |             |
| Opponent 1  | Opponent 2  |
|             |             |
+---------------------------+
|                           |
|         Player            |
|                           |
+---------------------------+
```

### 4-Player Layout
```
+-------+-------+-------+
|       |       |       |
| Opp 1 | Opp 2 | Opp 3 |
|       |       |       |
+---------------------------+
|                           |
|         Player            |
|                           |
+---------------------------+
```

### Zoomed Opponent View (4-Player Example)
```
+---+---+-------------------+
|O1 |O3 |                   |
+---+---+  Opponent 2       |
|         (Zoomed View)     |
|                           |
+---------------------------+
|                           |
|         Player            |
|                           |
+---------------------------+
```

## Visual Design Elements

### Card Visualization
- Cards sourced from Scryfall API
- Normal size for battlefield display
- Larger size when hovering
- Card back shown for face-down cards

### Color Scheme
- Dark background to make card colors pop
- Player areas subtly differentiated by border color
- Active player/phase highlighted

### Animations
- Tab animations for transitions between views
- Minimal animations to maintain focus on gameplay

## Accessibility Considerations

- High contrast mode option
- Scalable text and UI elements
- Keyboard shortcuts for common actions
- Color-blind friendly indicators

## Mobile/Tablet Considerations

While the primary focus is desktop, the layout should be designed with these principles in mind:
- Collapsible zones to save space
- Touch-friendly targets for card manipulation
- Ability to switch between opponents via swipe gestures

## Next Steps

1. Create detailed wireframes for each layout configuration
2. Design component mockups for cards, zones, and UI controls
3. Develop interactive prototype to test usability
4. Implement responsive UI using React components
