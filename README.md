# Mind Clash Multiplayer

Mind Clash is a small real-time quiz game. Players join the same lobby, answer the same questions, earn 100 points for each correct answer, and see the winner after five rounds.

## What you need

Install **Node.js LTS** first. If `node --version` in PowerShell does not work, install it from [nodejs.org](https://nodejs.org/) and then close and reopen PowerShell.

## Run the game on Windows

1. Open PowerShell.
2. Move into this project folder:

   ```powershell
   cd "C:\Users\olase\Documents\Codex\2026-10-26\w\mind-clash-multiplayer"
   ```

3. Install the game packages (only needed the first time):

   ```powershell
   npm install
   ```

4. Start the game server:

   ```powershell
   npm start
   ```

5. Leave that PowerShell window open. When you see `Mind Clash Multiplayer is running`, open this address in a browser:

   ```text
   http://localhost:3000
   ```

6. To stop the server later, return to PowerShell and press `Ctrl + C`.

## Test multiplayer with two browser windows

1. With the server running, open `http://localhost:3000` in one browser window.
2. Open the same address in a second browser window (or use an Incognito/InPrivate window).
3. Enter a different player name in each window and join the lobby.
4. The first player to join is the **host**. In that window, choose **Start Game**.
5. Answer the questions in both windows. Each correct answer is worth 100 points.
6. After five rounds, both windows show the same final winner.

## Project files

- `server.js` — Node.js server, game rules, scores, and Socket.IO events.
- `public/index.html` — game page structure.
- `public/style.css` — visual design.
- `public/app.js` — browser-side game behavior.
- `package.json` — package list and start command.

## Beginner notes

The game only keeps players and scores in memory, so restarting the server resets the match. For now, all players must use the same computer through multiple browser windows. A later version can allow phones or other computers on the same Wi-Fi network to join.
