##jCrossword

A jQuery plugin to show a fully interactive crossword widget on your page. The minimum information you need to supply is a string array representing the grid layout, and two arrays (of either objects or strings) representing the across and down clues.
Clue numbers will automatically be added into the grid and to each appropriate clue when the grid and clues are rendered.

####Grid

Each string in the array representing the grid maps a row in the grid; a space character represents an empty tile (where letters are to be filled in), and any character other than a space represents an inactive tile. For example, the following array will render as a 3x3 grid, with three letter clues around the outside:

```javascript
var grid = ["   ",
            " @ ",
            "   "];
```

####Clues

You can choose to supply the answer or clue pattern with the clue, but if you don't the plugin will calculate the pattern from its space in the grid (and will assume the answer is a single word).

For instance, the following two clue objects are identical:

```javascript
// Delimit the clue and its answer with "%%".
var clue = "Highest mountain in the world%%EVEREST";
``` 
```javascript
var clue = { text: "Highest mountain in the world", answer: "EVEREST" };
```

and will both be rendered as (depending on the calculated clue number):

> **1** Highest mountain in the world (7)

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

which will render as:

> **1** City containing the borough of Manhattan (3,4)

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

which will render as:

> **1** A relative of one's spouse (2-3)

####Multi-clues

Multi-clues (where a clue's answer is filled in over more than one clue space in the grid) are catered for. To achieve this, specify an ID code for each 'sub-clue' inside double square brackets and then reference them in the 'root clue', delimited by "++". For example:

```javascript
var clues = ["City containing the borough of Manhattan++SUBCLUE1%%NEW YORK",
                "[[SUBCLUE1]]"]
```

will render as:

>**1** City containing the borough of Manhattan (3,4) <br/>
>**2** See 1

The text of the 'sub-clues' (i.e. "See 1" or "See 1a", if there is also a  1d clue) will be automatically generated, and every part of the multi-clue will be highlighted when any part is selected.

####Styling

From CSS, you can control the styling of highlighted clues, how the 'cursor' in a highlighted clue is shown, how correct and incorrect clues are shown, and how a clue text is highlighted. Sample CSS stylings are:

```CSS
#cwd-grid td.cwd-tile-highlight
{
    background-color: Yellow !important;
}

#cwd-grid td.cwd-tile-cursor
{
    border-color: White !important;
}

#cwd-grid td.cwd-tile-correct
{
    background-color: Lime !important;
}

#cwd-grid td.cwd-tile-incorrect
{
    border-color: Red !important; 
}

.cwd-clue-highlight
{
    font-weight: bold;
}
```

###Options

<table>
  <tr>
    <th>Name</th><th>Type</th><th>Comments</th><th>Default</th>
  </tr>
  <tr>
    <td>colour</td><td>String</td><td>The colour of the grid (inactive tiles and border).</td><td>"Black"</td>
  </tr>
  <tr>
    <td>cluesToRight</td><td>Boolean</td><td>If true, clues are rendered to the right of the grid, else below.</td><td>True</td>
  </tr>
  <tr>
    <td>clueBox</td><td>Boolean</td><td>Determines whether a clue box is displayed under the grid.</td><td>True</td>
  </tr>
  <tr>
    <td>validateAnswer</td><td>String</td><td>Determines the type of answer validation (if answers were supplied). Values: "none", "clue" (validate after every clue), "grid" (validate when grid complete).</td><td>"none"</td>
  </tr>
  <tr>
    <td>tileSize</td><td>Integer</td><td>Size of each tile square.</td><td>25</td>
  </tr>
</table>

####Usage:

```javascript
$('<div />').crossword({ grid: grid,
                            acrossClues: acrossClues,
                            downClues: downClues,
                            cluesToRight: false,
                            validateAnswer: 'clue' });
```    
or 
    
```javascript
var crosswordDiv = $('div#crossword');
$.crossword(crosswordDiv, { grid: grid,
                            acrossClues: acrossClues,
                            downClues: downClues,
                            cluesToRight: false,
                            validateAnswer: 'clue' });
```
