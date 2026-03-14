🦠 AI-Powered Virus Survival Game

An AI-powered browser survival game where players navigate through a hazardous grid while avoiding bombs, virus traps, and obstacles. The game integrates Breadth-First Search (BFS) to generate intelligent hint paths that guide players toward the safest route.

🎮 Demo

📹 Demo Video: (Add your demo video link here)

🕹 Play the Game: (Add GitHub Pages / live link if deployed)

📖 Game Overview

The game runs on a 20×30 interactive grid where the player starts at the top-left corner and must safely reach the exit. The environment contains multiple hazards and obstacles that make the gameplay strategic and unpredictable.

To assist players, the game includes an AI-based hint system that calculates the safest path while avoiding dangerous cells.

✨ Features

✔ 20×30 interactive grid board
✔ Player movement using W / A / S / D or Arrow Keys
✔ AI Hint Path using BFS algorithm
✔ Dynamic hazard shuffling each turn
✔ Multiple power-ups and bonuses
✔ Score, timer, and turn tracking
✔ Game Over screen with restart option

⚠️ Hazards
Hazard	Effect
💣 Bomb	Instant game over without shield
☠️ Virus Trap	Deadly hazard
⚠️ Yellow Trap	Sends player back to start
🧱 Walls	Blocks player movement
⚡ Power-Ups

🛡 Shield – Protects from bombs and virus traps for 3 turns
⚡ Double Move – Allows 2 moves in a single turn
⭐ Energy Boost – +10 points
✨ Bonus Star – +5 points

🧠 AI Components

1️⃣ BFS Pathfinding Algorithm

Calculates the safest path

Avoids bombs, virus traps, traps, and walls

2️⃣ Hazard Shuffle Algorithm

Around 30% hazards reposition every turn

Keeps gameplay dynamic and unpredictable

3️⃣ Dynamic Power-Up Generation

Random power-ups appear during gameplay

🛠 Tech Stack

HTML – Game structure and grid layout

CSS – Styling, animations, UI design

JavaScript – Game logic, AI algorithms, event handling

🚀 Future Improvements

User login system

Leaderboard

Player progress saving

Multiplayer mode

AI enemies with pathfinding

👩‍💻 Authors
