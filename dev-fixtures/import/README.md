# Import Fixture Check

Use your `hands skip.json` export as a manual fixture for local verification.

## Steps

1. Run the app and click `Import` in the right panel.
2. Select `hands skip.json`.
3. Confirm:
   - play name becomes `hands skip`
   - keyframes appear and are selectable on the Control Pill
   - pressing Play animates players and ball immediately
4. Re-export and confirm `schemaVersion` is `1.0.0` and play name is unchanged.

## Track sanity check

For the sample file, the ball track should include ms times like:
- `0`
- `7740`
- `15026`
- `22472`
- `29708`
