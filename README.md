# Logic Gate Challenge: Circuit Puzzle Lab

An educational game to learn digital logic gates through interactive circuit building puzzles.

## Features

### Core Gameplay
- **16 Progressive Levels**: From basic gates to complex circuits
- **Multiple Game Modes**:
  - Truth Table Challenges: Build circuits matching given truth tables
  - Boolean Formula Challenges: Implement logic formulas like "A AND (B OR C)"
  - Multi-Input Puzzles: Handle 3-5 inputs with complex logic

### Interactive Circuit Building
- **Named Inputs**: Input gates are labeled A, B, C, D, E for easy reference
- **Real-time Evaluation**: Circuit output updates instantly as you toggle inputs
- **Visual Signal Flow**: See animated signals flowing through your circuit
- **Drag & Drop**: Move gates around the canvas to organize your circuit

### Smart Validation
- **Input Limits**: 
  - NOT gates: 1 input only
  - AND/OR/NAND/NOR/XOR gates: 2 inputs maximum
  - Cannot connect INPUT to INPUT
  - Cannot connect from OUTPUT gates
- **Connection Management**: Right-click to delete connections

### Undo/Redo System
- **Full History**: Undo/Redo all actions (Ctrl+Z / Ctrl+Y)
- **50 Action Buffer**: Keep track of your last 50 changes
- **Smart State Management**: Automatically saves after each action

### Progress Tracking
- **Level Completion**: Track which levels you've completed
- **Auto-Save**: Progress saved to browser localStorage
- **Visual Indicators**: Checkmarks show completed levels

## How to Play

1. **Select a Level**: Click on level buttons at the bottom
2. **Add Gates**: Click on available gate buttons to add them to the canvas
3. **Connect Gates**: 
   - Click "Connect Mode" button
   - Click source gate, then target gate
   - Or drag from one gate to another
4. **Toggle Inputs**: Click on INPUT gates to switch between 0 and 1
5. **Test Circuit**: Click "Test Circuit" to verify your solution
6. **Undo/Redo**: Use buttons or Ctrl+Z / Ctrl+Y to undo/redo actions

## Gate Types

- **INPUT**: Toggle between 0 and 1 (labeled A, B, C...)
- **OUTPUT**: Shows the final result
- **AND**: True when ALL inputs are true
- **OR**: True when ANY input is true
- **NOT**: Inverts the input
- **NAND**: NOT-AND (opposite of AND)
- **NOR**: NOT-OR (opposite of OR)
- **XOR**: True when inputs are DIFFERENT

## Level Types

### Basic Gates (Levels 1-6)
Learn individual gate behaviors with simple 2-input circuits.

### Gate Combinations (Levels 7-10)
Combine multiple gates to create complex logic functions.

### Multi-Input Challenges (Levels 11-12)
Handle 3-4 inputs with majority and parity functions.

### Boolean Formula Mode (Levels 13-15)
Implement specific boolean formulas:
- A AND (B OR C)
- (A OR B) AND (C OR D)
- NOT(A) AND (B OR NOT(C))

### Advanced Challenges (Level 16)
Complex 5-input circuits requiring strategic gate placement.

## Keyboard Shortcuts

- **Ctrl+Z**: Undo
- **Ctrl+Y** or **Ctrl+Shift+Z**: Redo

## Tips

- Start with the truth table - understand what output you need for each input combination
- For boolean formulas, work from inside parentheses outward
- Use the hints - they guide you without giving away the solution
- Organize your gates to make connections clear
- Test frequently to catch errors early

## Technical Details

- Pure JavaScript (no frameworks)
- HTML5 Canvas for circuit rendering
- LocalStorage for progress persistence
- Responsive design for different screen sizes

## Browser Compatibility

Works in all modern browsers supporting:
- HTML5 Canvas
- ES6 JavaScript
- LocalStorage API

Enjoy learning digital logic!
