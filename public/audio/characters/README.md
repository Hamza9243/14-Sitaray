# Character call audio

Drop pre-recorded MP3 files here for the Character Call Reminder feature
(`src/screens/IncomingCallScreen.tsx`, config in `src/data/characters.ts`).
Files are served as plain static assets — no rebuild needed after adding them,
just refresh the app.

No audio here yet? The call still works: it shows the character's line as
on-screen text and, after a short pause, continues straight into the reminder's
activity (see CharacterAudioManager's fallback in
`src/lib/characterAudio.ts`).

## Expected files

```
public/audio/characters/
  ali/
    welcome.mp3     — generic greeting, used if no type-specific line is needed
    story.mp3       — "...Chalo, aaj ki story sunte hain!"
    dua.mp3         — "...Chalo, aaj ki dua parhte hain!"
    game.mp3        — "...Chalo, aaj ka challenge complete karte hain!"
    learning.mp3    — "...Chalo, aaj kuch naya seekhte hain!"
  sakina/
    welcome.mp3
    story.mp3
    dua.mp3
    game.mp3
    learning.mp3
```

Exact scripted lines for each file are in `CHARACTERS[...].dialogueByType` in
`src/data/characters.ts` — Ali uses "raha hoon", Sakina uses "rahi hoon".

Recommended: friendly, warm, playful child-directed voice, MP3, mono, under
15 seconds per line.
