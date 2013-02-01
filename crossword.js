(function ($) {

    $.crossword = function (data, options) {

        var cursorIndex;
        var acrossClues = [];
        var downClues = []
        var multiClues = [];
        var impl = {

            init: function (data, options) {
                var s = this;
                var dataType = typeof (data);

                if (dataType === 'object') {
                    data = data instanceof $ ? data : $(data);
                }
                else if (dataType === 'string' || dataType === 'number') {
                    data = $('<div />').html(data);
                }
                else {
                    // Unsupported data type.
                    return false;
                }
                data.css('visibility', 'hidden');

                var grid = s.buildGrid(options);

                data.append(grid);

                s.bindEvents();

                s.appendClues(data, grid.outerWidth());

                impl.columniseClues(grid.outerWidth());

                data.hide();
                data.css('visibility', 'visible');
                data.fadeIn('slow');

                return true;
            },

            buildGrid: function (options) {
                var gridWidth = options.gridMask[0].length;
                var gridHeight = options.gridMask.length;
                var gridSize = { width: gridWidth ? gridWidth : 0, height: gridHeight ? gridHeight : 0 };

                options.acrossClues = options.acrossClues ? options.acrossClues : [];
                options.downClues = options.downClues ? options.downClues : [];

                var grid = $('<table id="grid" cellSpacing="0" rowSpacing="0"></table>');
                var clueNo = 1;
                var s = this;

                // Build the bare grid.
                for (i = 0; i < gridSize.height; i++) {
                    grid.append('<tr />');
                    var row = $(grid).find('tr').last()

                    for (j = 0; j < gridSize.width; j++) {
                        row.append(this.stringFormat('<td class="tile" row="{0}" col="{1}" />', i, j));

                        if (typeof (options.gridMask[i]) !== 'undefined' && options.gridMask[i].charAt(j) === '@') {
                            row.children().last().addClass('tile-inactive');
                        }
                        else {
                            row.children().last().addClass('tile-active');
                        }
                    }
                }

                var acrossClueIndex = 0, downClueIndex = 0;
                // Iterate through each active tile, adding clue numbers where appropriate and build clue arrays.
                grid.find('td.tile-active').each(function () {
                    // Work out whether it's a numbered tile
                    var i = parseInt($(this).attr('row')), j = parseInt($(this).attr('col'));

                    // Inactive tile to left (or edge) AND active tile to right => start of across clue.
                    var acrossNo = (j === 0 || options.gridMask[i].charAt(j - 1) === '@') &&
                                (j < gridSize.width - 1 && options.gridMask[i].charAt(j + 1) !== '@')

                    // Inactive tile above (or edge) AND active tile below => start of down clue.
                    var downNo = (i === 0 || options.gridMask[i - 1].charAt(j) === '@') &&
                                (i < gridSize.height - 1 && options.gridMask[i + 1].charAt(j) !== '@')

                    var row = i, col = j, direction;
                    if (acrossNo) {
                        while (col < gridSize.width) {
                            var thisTile = grid.find(s.stringFormat('td[row={0}][col={1}]', row, col));
                            if (thisTile.hasClass('tile-inactive')) {
                                break;
                            }
                            else {
                                thisTile.attr('acrossClueNo', clueNo);
                            }
                            col++;
                        }

                        // Convert clue array into an object array.
                        acrossClues.push(s.buildClueObject(
                                        options.acrossClues[acrossClueIndex], clueNo, (col - j), 'a', (acrossNo && downNo)));
                        acrossClueIndex++;
                    }

                    row = i;
                    col = j;
                    if (downNo) {
                        while (row < gridSize.height) {
                            var thisTile = grid.find(s.stringFormat('td[row={0}][col={1}]', row, col));
                            if (thisTile.hasClass('tile-inactive')) {
                                break;
                            }
                            else {
                                thisTile.attr('downClueNo', clueNo);
                            }
                            row++;
                        }

                        // Convert clue array into an object array.
                        downClues.push(s.buildClueObject(
                                        options.downClues[downClueIndex], clueNo, (row - i), 'd', (acrossNo && downNo)));
                        downClueIndex++;
                    }

                    $.each(multiClues, function (index, value) {
                        var rootClue = value.clue;
                        $.each(value.multiParts, function (index2, subClueText) {
                            var findText = s.stringFormat("[[{0}]]", subClueText);
                            var subClue = s.findClueByText(findText);
                            if (subClue) {
                                subClue.text = s.stringFormat(
                                            "See {0}{1}", rootClue.number, rootClue.bothWays ? rootClue.direction : '');
                                subClue.pattern = null;
                                //subClue.answer = rootClue.answer.substring(rootClue.length, rootClue.length + subClue.length);
                                rootClue.subClues.push({ number: subClue.number, direction: subClue.direction });
                            }
                        });
                        //rootClue.answer = rootClue.answer.substring(0, rootClue.length);
                    });

                    if (acrossNo || downNo) {
                        // Add a clue number label to the tile.
                        $('<span class="clue-no" />')
                                        .text(clueNo++)
                                        .css('position', 'absolute')
                                        .appendTo($(this));
                    }
                });

                return grid;
            },

            buildClueObject: function (clue, clueNo, clueLength, clueDirection, bothWays) {
                var clueText, clueAnswer, cluePattern;
                if (typeof (clue) === 'object') {
                    clueText = clue.text;
                    clueAnswer = clue.answer;
                    cluePattern = clue.pattern;
                }
                else if (typeof (clue) === 'string') {
                    var parts = clue.split('%%');
                    clueText = parts[0];
                    if (/[A-Z]/i.test(parts[1])) {
                        clueAnswer = parts[1];
                    }
                    else {
                        cluePattern = parts[1];
                    }
                }

                // Store multi-clue parts to parse later.
                var clueParts = clueText.split('++');
                var multiParts = [];
                if (clueParts.length > 1) {
                    clueText = clueParts[0];
                    multiParts = clueParts.slice(1);
                }

                // Derive the clue pattern from the answer. For example:
                //  "Northern lights" --> "8,6"
                //  "Hard-headed" --> "4-6"
                if (!cluePattern && clueAnswer) {
                    var partLength = 0, cluePattern = '';
                    for (i = 0; i < clueAnswer.length; i++) {
                        if (/[A-Z]/i.test(clueAnswer.charAt(i))) {
                            partLength++;
                        }
                        else {
                            // A non-alpha character detected - append the clue part length and appropriate separator.
                            cluePattern = cluePattern.concat(partLength.toString());
                            cluePattern = cluePattern.concat(clueAnswer.charAt(i) === '-' ? '-' : ',');
                            partLength = 0;
                            // Skip over any further non-alpha characters.
                            while (!/[A-Z]/i.test(clueAnswer.charAt(i + 1)) && (i + 1) < clueAnswer.length) {
                                i++;
                            }
                        }
                    }
                    cluePattern = cluePattern.concat(partLength.toString());
                }

                // If the pattern still isn't determined (no answer or pattern supplied), just set it to the clue length.
                if (!cluePattern) {
                    cluePattern = clueLength.toString();
                }

                // Enclose the clue pattern in brackets.
                cluePattern = this.stringFormat("({0})", cluePattern);

                // Strip non-alpha characters from answer so it can be validated.
                if (clueAnswer) {
                    clueAnswer = clueAnswer.replace(/[^A-Z]/ig, '');
                }

                // TODO: Validate clue pattern against length.

                var clueObj = { text: clueText,
                    number: clueNo,
                    length: clueLength,
                    answer: clueAnswer,
                    pattern: cluePattern,
                    direction: clueDirection,
                    bothWays: bothWays,
                    subClues: []
                };

                if (multiParts.length > 0) {
                    multiClues.push({ clue: clueObj, multiParts: multiParts });
                }

                return clueObj;
            },

            bindEvents: function () {
                var s = this;

                $('#grid td.tile-active').click(function () {
                    s.showClue($(this));
                });

                $('#grid td.tile-active').mousedown(function (event) {
                    //if (event.which === 3) {
                    // Right-click
                    //    alert('rclick');
                    //}
                });

                $(document).keydown(function (event) {
                    var highlightedTiles = $('#grid td.tile-highlight');

                    if (highlightedTiles.length > 0) {
                        event = event ? event : window.event;
                        if (!event) return true;
                        var code = event.keyCode || event.which || null;
                        if (!code) return true;

                        // Get the direction of the (first word in the) highlighted clue.
                        var direction = highlightedTiles.filter('[cursorIndex=0]').attr('row') ===
                                            highlightedTiles.filter('[cursorIndex=1]').attr('row') ? 'a' : 'd';
                        var oppDirection = direction === 'a' ? 'd' : 'a';

                        // Deleting - 8=backspace
                        if (code === 8) {
                            if (cursorIndex > 0) {
                                highlightedTiles.filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex--)).removeClass('tile-cursor');
                                // Don't delete tile letters that have been filled in as part of another clue.
                                while (cursorIndex > 0 &&
                                    highlightedTiles
                                        .filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex))
                                        .find('div.tile-letter')
                                        .attr(oppDirection) === 'true') {
                                    cursorIndex--;
                                }
                                highlightedTiles
                                    .filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex))
                                    .addClass('tile-cursor')
                                    .find('div.tile-letter').not('[' + oppDirection + '=true]').remove();
                                highlightedTiles.removeClass('tile-correct').removeClass('tile-incorrect');
                            }
                        }
                        else {
                            // Check for letter (case insensitive).
                            var charEntered = String.fromCharCode(code).toUpperCase();

                            if (/[A-Z]/i.test(charEntered)) {
                                // Add a letter into the cell, horizontally centre-aligned.
                                var letter = $('<div class="tile-letter"/>')
                                                .text(charEntered)
                                                .css('text-align', 'center')
                                                .attr(direction, 'true')
                                                .appendTo(highlightedTiles.filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex)));
                                // Align it vertically.
                                letter.css('margin-top', (letter.parent().height() - letter.height()) / 2)
                                // Move the 'cursor' on.
                                highlightedTiles.filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex++)).removeClass('tile-cursor');
                                // Move the cursor past any squares that have been written into already.
                                while (cursorIndex < highlightedTiles.length &&
                                    highlightedTiles.filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex)).find('div.tile-letter').length > 0) {
                                    cursorIndex++;
                                }
                                if (cursorIndex < highlightedTiles.length) {
                                    highlightedTiles.filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex)).addClass('tile-cursor');
                                }
                                else {
                                    // Validate answer.
                                    var enteredAnswer = '', actualAnswer = '';
                                    // Get the entered answer.
                                    for (i = 0; i < highlightedTiles.length; i++) {
                                        var letter = highlightedTiles
                                                            .filter(impl.stringFormat('[cursorIndex={0}]', i))
                                                            .find('div.tile-letter')
                                                            .text();
                                        enteredAnswer = enteredAnswer.concat(letter);
                                    }

                                    var clueNo;
                                    // Across clue is highlighted, look for answer in across clues array.
                                    if (direction === 'a') {
                                        clueNo = parseInt(highlightedTiles.filter('[cursorIndex=0]').attr('acrossClueNo'));
                                    }
                                    else {
                                        // Down clue is highlighted, look for answer in down clues array.
                                        clueNo = parseInt(highlightedTiles.filter('[cursorIndex=0]').attr('downClueNo'));
                                    }

                                    var clue = s.findClueByNumber(clueNo, direction);
                                    var actualAnswer = clue ? clue.answer : null;

                                    // If there was an answer supplied, validate it.
                                    if (actualAnswer) {
                                        if (actualAnswer.toUpperCase() === enteredAnswer) {
                                            highlightedTiles.addClass('tile-correct');
                                            setTimeout(function () {
                                                highlightedTiles.removeClass('tile-correct');
                                            }, 1500);
                                        }
                                        else {
                                            highlightedTiles.addClass('tile-incorrect');
                                        }
                                    }
                                }
                            }
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        return false;
                    }
                });
            },

            findClueByNumber: function (clueNo, direction) {
                var number = clueNo;
                if (typeof (number) === 'string') {
                    number = parseInt(number);
                }
                var findFunc = function (c) { return c.number === number };
                return this.findClue(direction, findFunc);
            },

            findClueByText: function (clueText, direction) {
                var findFunc = function (c) { return c.text === clueText };
                return this.findClue(direction, findFunc);
            },

            findClue: function (direction, findFunc) {
                // If no direction specified, search both clue arrays, meaning first will be returned if there's more than
                // one match.
                direction = direction ? direction : 'b';

                var foundClues = [];
                if (direction === 'a' || direction === 'b') {
                    foundClues = $.grep(acrossClues, findFunc);
                }
                if (foundClues.length === 1) {
                    return foundClues[0];
                }

                if (direction === 'd' || direction === 'b') {
                    foundClues = $.grep(downClues, findFunc);
                }
                if (foundClues.length === 1) {
                    return foundClues[0];
                }

                return null;
            },

            appendClues: function (data, width) {
                // Attach a clue box.
                var clueBoxDiv = $('<div id="clueBox" class="clue-box"><span id="clueBoxText"></span></div');
                data.append(clueBoxDiv);
                clueBoxDiv.outerWidth(width);

                var cluesDiv = $('<div id="clues" class="clues" />');
                var missingClue = '<span style="color: red;">Missing clue</span>';
                var s = this;

                // Across clues.
                cluesDiv.append('<div class="clue-header">ACROSS</div>');
                $.each(acrossClues, function (index, clue) {
                    cluesDiv.append(s.stringFormat(
                                    '<div><span><b>{0}</b></span><span id="{0}a"> {1} {2}</span></div>',
                                    clue.number,
                                    clue.text ? clue.text : missingClue,
                                    clue.pattern ? clue.pattern : ''));
                });

                // Down clues.
                cluesDiv.append('<div class="clue-header">DOWN</div>');
                $.each(downClues, function (index, clue) {
                    cluesDiv.append(s.stringFormat(
                                    '<div><span><b>{0}</b></span><span id="{0}d"> {1} {2}</span></div>',
                                    clue.number,
                                    clue.text ? clue.text : missingClue,
                                    clue.pattern ? clue.pattern : ''));
                });

                cluesDiv.outerWidth(width);
                data.append(cluesDiv);
            },

            showClue: function (tile) {
                var clueNo = this.highlightTiles(tile);
                // Highlight corresponding clue text.
                $('#clues span.clue-highlight').removeClass('clue-highlight');
                var clueText = $(this.stringFormat('#clues span#{0}', clueNo)).addClass('clue-highlight').text();
                $('#clueBox span').fadeOut('fast', function () {
                    $('#clueBox span').text(clueText);
                    $('#clueBox span').fadeIn('fast');
                });
            },

            highlightTiles: function (tile) {
                var s = this, prevHighlight = 0;
                // Record which direction the (originally clicked on) clue is currently hightlighted in, if any - 1=across, 2=down
                if (tile.hasClass('tile-highlight')) {
                    prevHighlight = tile.prev('td.tile-active').hasClass('tile-highlight') ||
                                   tile.next('td.tile-active').hasClass('tile-highlight') ? 1 : 2;
                }
                // Remove any current highlighting
                $('#grid td.tile-highlight').removeClass('tile-highlight');
                $('#grid td.tile-cursor').removeClass('tile-cursor');

                var acrossClueNo = tile.attr('acrossClueNo');
                var downClueNo = tile.attr('downClueNo');
                var highlightedTiles;
                var highlightedClue = 'none';
                var subClues = [];
                var s = this;
                cursorIndex = 0;

                // Highlight the across clue.    
                if (acrossClueNo && prevHighlight === 0) {
                    $(this.stringFormat('#grid td[acrossClueNo={0}]', acrossClueNo))
                            .addClass('tile-highlight')
                            .each(function (index, value) { $(this).attr('cursorIndex', cursorIndex++); });
                    highlightedClue = acrossClueNo + 'a';

                    var rootClue = s.findClueByNumber(acrossClueNo, 'a');
                    if (rootClue) {
                        subClues = rootClue.subClues;
                    }
                }
                else {
                    // Highlight the down clue.
                    if (downClueNo && prevHighlight !== 2) {
                        $(this.stringFormat('#grid td[downClueNo={0}]', downClueNo))
                                .addClass('tile-highlight')
                                .each(function (index, value) { $(this).attr('cursorIndex', cursorIndex++); });
                        highlightedClue = downClueNo + 'd';

                        var rootClue = s.findClueByNumber(downClueNo, 'd');
                        if (rootClue) {
                            subClues = rootClue.subClues;
                        }
                    }
                }

                // Also highlight any sub-clues.
                $.each(subClues, function (index, subClue) {
                    switch (subClue.direction) {
                        case 'a':
                            $(s.stringFormat('#grid td[acrossClueNo={0}]', subClue.number)).addClass('tile-highlight')
                                    .each(function (index, value) { $(this).attr('cursorIndex', cursorIndex++); });
                            break;
                        case 'd':
                            $(s.stringFormat('#grid td[downClueNo={0}]', subClue.number)).addClass('tile-highlight')
                                    .each(function (index, value) { $(this).attr('cursorIndex', cursorIndex++); });
                            break;
                    }
                });

                // Find the first highlighted tile without a filled in letter, and put the cursor there.
                var highlightedTiles = $('#grid td.tile-highlight');
                cursorIndex = 0;
                while (cursorIndex < highlightedTiles.length &&
                        highlightedTiles
                            .filter(s.stringFormat('[cursorIndex={0}]', cursorIndex))
                            .find('div.tile-letter').length > 0) {
                    cursorIndex++;
                }
                highlightedTiles
                    .filter(s.stringFormat('[cursorIndex={0}]', cursorIndex))
                    .addClass('tile-cursor');

                return highlightedClue
            },

            columniseClues: function (dimension, byHeight) {
                var cluesDiv = $('#clues');
                var columnWidth = (dimension / 2) - 5;

                var getNewColumn = function (number) {
                    return $(impl.stringFormat('<div id="col{0}" style="position: relative; display: inline-table; vertical-align: top; width: {1};" />', number, columnWidth));
                }

                var colDivs = [];
                colDivs.push(getNewColumn(0));

                cluesDiv.children('div').each(function () {
                    $(this).remove().appendTo(colDivs[0]);
                });

                cluesDiv.append(colDivs[0]);

                var columnHeight = byHeight ? dimension : colDivs[0].height() / 2;
                var col = 1, done = false;

                while (!done) {
                    var newColumn = false;
                    colDivs[col - 1].children('div').each(function () {
                        if ($(this).position().top > columnHeight) {
                            if (!newColumn) {
                                colDivs.push(getNewColumn(col));
                                newColumn = true;
                            }
                            $(this).remove().appendTo(colDivs[col]);
                        }
                    });
                    if (newColumn === true) {
                        cluesDiv.append(colDivs[col]);
                        col++
                    }
                    else {
                        done = true;
                    }
                }

                cluesDiv.children('div').each(function() {
                    if ($(this).attr('id') !== 'col' + (col-1)) {
                        $(this).css('margin-right', '5px');
                    }
                });
            },

            stringFormat: function () {
                var resultString = arguments[0];
                var args = arguments;
                if (typeof (resultString) != 'undefined') {
                    resultString = resultString.replace(/{(\d+)}/g, function (match, number) {
                        var index = parseInt(number) + 1;
                        return typeof (args[index]) != 'undefined' ? args[index] : match;
                    });
                }
                return resultString;
            }
        };

        impl.init(data, options);

        return data;
    }

    $.fn.crossword = function (options) {
        return $.crossword(this, options);
    }

})(jQuery);
