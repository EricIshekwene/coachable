# Coachable Slate

## DEV NOTES

### Keyframe triggers
- Adding a player
- Deleting a player
- Moving any player or the ball (recorded on drag end)
- Changing player color or size
- Changing field rotation
- Updating pitch settings (size, color, markings)
- Toggling player label/number display

### Snapshot contents
- Objects: id, type (player/ball), position (x/y), color, size, label, number, visible.
- Field: rotation, pitch size, pitch color, show markings.
- Display settings: show number, show name.
- Zoom is treated as a view setting and is **not** stored in snapshots.

### JSON export schema (example)
```json
{
  "version": 1,
  "meta": {
    "name": "Twister"
  },
  "field": {
    "rotation": 0,
    "pitchColor": "#6FAF7B",
    "pitchSize": "Full Field",
    "showMarkings": true
  },
  "objects": [
    {
      "id": "player-1",
      "type": "player",
      "color": "#ef4444",
      "size": 100,
      "label": "Player 1",
      "number": "1",
      "visible": true
    },
    {
      "id": "ball-1",
      "type": "ball",
      "color": "#F8FAFC",
      "size": 25,
      "label": "Ball",
      "number": "",
      "visible": true
    }
  ],
  "keyframes": [
    {
      "id": "keyframe-1",
      "field": {
        "rotation": 0,
        "pitchColor": "#6FAF7B",
        "pitchSize": "Full Field",
        "showMarkings": true
      },
      "display": {
        "showNumber": false,
        "showName": false
      },
      "objects": [
        {
          "id": "player-1",
          "type": "player",
          "x": 0.3,
          "y": 0.5,
          "color": "#ef4444",
          "size": 100,
          "label": "Player 1",
          "number": "1",
          "visible": true
        }
      ]
    }
  ]
}
```
