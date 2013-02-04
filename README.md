##jCrossword

A jQuery plugin to show a fully interactive crossword widget on your page. The minimum information you need to supply is a string array representing the grid layout, and two arrays (of either objects or strings) representing the across and down clues.

You can choose to supply the answer or clue pattern with the clue, but if you don't the plugin will calculate the pattern from its space in the grid (and will assume the answer is a single word).

For instance, the following two clue objects are identical:

```javascript
// Delimit the clue and its answer with "%%".
var clue = "Highest mountain in the world%%EVEREST";
``` 
```javascript
var clue = { text: "Highest mountain in the world", answer: "EVEREST" };
```
If the answer is more than one word, you'll have to supply either an answer or a pattern:
```javascript
var clue = "City containing the borough of Manhattan%%NEW YORK";
```
or
```javascript
var clue = { text: "City containing the borough of Manhattan", answer: "NEW YORK" };
```
or
```javascript
var clue = { text: "City containing the borough of Manhattan", pattern: "3,4" };
```

Hyphenated clues are catered for:

```javascript
var clue = "A relative of one's spouse%%IN-LAW";
```    
or
```javascript
var clue = { text: "A relative of one's spouse", answer: "IN-LAW" };
````
or
```javascript
var clue = { text: "A relative of one's spouse", pattern: "2-3" };
```    
TODO: Multi-clues, options (clue position, validation), CSS
    
####Usage:

```javascript
$('<div />').crossword({ grid: grid, acrossClues: acrossClues, downClues: downClues });
```    
or 
    
```javascript
var crosswordDiv = $('div#crossword');
$.crossword(crosswordDiv, { grid: grid, acrossClues: acrossClues, downClues: downClues });
```
