(function ($) {

    $.crossword = function (data, options) {

        var defaultOptions = {
            cluesToRight: true,
            clueBox: true,
            validateAnswer: true
        };
        var cursorIndex;
        var clues = [];
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

                s.appendGrid(options);
                s.appendClues(data, options.cluesToRight);
                s.bindEvents();

                data.hide();
                data.css('visibility', 'visible');
                data.fadeIn('slow');

                return true;
            },

            appendGrid: function (options) {
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
                        row.append(this.stringFormat('<td class="tile" row="{0}" col="{1}">&nbsp;</td>', i, j));

                        if (typeof (options.gridMask[i]) !== 'undefined' && options.gridMask[i].charAt(j) === '@') {
                            row.children().last().addClass('tile-inactive');
                        }
                        else {
                            row.children().last().addClass('tile-active');

                        }
                    }
                }

                var index = 0, acrossClueIndex = 0, downClueIndex = 0;
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

                    var row = i, col = j;
                    if (acrossNo) {
                        while (col < gridSize.width) {
                            var thisTile = grid.find(s.stringFormat('td[row={0}][col={1}]', row, col));
                            if (thisTile.hasClass('tile-inactive')) {
                                break;
                            }
                            else {
                                thisTile.attr('acrossClueId', index);
                            }
                            col++;
                        }

                        // Build array of clue objects.
                        clues.push(s.buildClueObject(
                            options.acrossClues[acrossClueIndex], index++, clueNo, (col - j), 'a', (acrossNo && downNo)));
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
                                thisTile.attr('downClueId', index);
                            }
                            row++;
                        }

                        // Build array of clue objects.
                        clues.push(s.buildClueObject(
                            options.downClues[downClueIndex], index++, clueNo, (row - i), 'd', (acrossNo && downNo)));
                        downClueIndex++;
                    }

                    if (acrossNo || downNo) {
                        // Add a clue number label to the tile.
                        $('<span class="clue-no" />')
                                        .text(clueNo++)
                                        .css('position', 'absolute')
                                        .appendTo($(this));
                    }
                });

                // Assign the text to the sub-clues of each multi-clue (e.g. "See 18a").
                $.each(multiClues, function (index, value) {
                    var rootClue = value.clue;
                    $.each(value.multiParts, function (index2, subClueText) {
                        var findText = s.stringFormat("[[{0}]]", subClueText);
                        var subClue = s.findClueByText(findText);
                        if (subClue) {
                            subClue.rootClueId = rootClue.id;
                            subClue.text = s.stringFormat(
                                            "See {0}{1}", rootClue.number, rootClue.bothWays ? rootClue.direction : '');
                            subClue.pattern = null;
                            rootClue.subClueIds.push(subClue.id);
                        }
                    });
                });

                // Attach a clue box?
                var clueBox = options.clueBox === true ?
                        $('<div id="clueBox" class="clue-box" ><span id="clueBoxText"></span></div>') : '';

                // Add the grid into the DOM.
                $('<div id="divGrid" />')
                    .append(grid)
                    .append(clueBox)
                    .appendTo(data)
                    .css({ display: "inline-block", width: grid.width() });
            },

            buildClueObject: function (clue, clueId, clueNo, clueLength, clueDirection, bothWays) {
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

                var clueObj = {
                    text: clueText,
                    id: clueId,
                    number: clueNo,
                    length: clueLength,
                    answer: clueAnswer,
                    pattern: cluePattern,
                    direction: clueDirection,
                    bothWays: bothWays,
                    rootClueId: -1,
                    subClueIds: []
                };

                if (multiParts.length > 0) {
                    multiClues.push({ clue: clueObj, multiParts: multiParts });
                }

                return clueObj;
            },

            bindEvents: function () {
                var s = this;

                $('#grid td.tile-active').click(function () {
                    var prevDirection = '';
                    // Record which direction the clue is currently hightlighted in, if any.
                    if ($(this).hasClass('tile-highlight')) {
                        prevDirection = $(this).prev('td.tile-active').hasClass('tile-highlight') ||
                                   $(this).next('td.tile-active').hasClass('tile-highlight') ? 'a' : 'd';
                    }
                    // Determine the ID of the clue to highlight (may be none).
                    var acrossClueId = $(this).attr('acrossClueId');
                    var downClueId = $(this).attr('downClueId');
                    var clueId = -1;

                    // Clue highlighting cycles in the sequence:
                    // Across (if tile in across clue), Down (if tile in down clue), None.
                    if (acrossClueId && prevDirection === '') {
                        clueId = acrossClueId;
                    }
                    else {
                        if (downClueId && prevDirection !== 'd') {
                            clueId = downClueId;
                        }
                    }
                    impl.showClue(clueId);
                });

                $('#clues span[id^=clueText-]').click(function () {
                    var clueId = -1;
                    if (!$(this).hasClass('clue-highlight')) {
                        clueId = parseInt($(this).attr('id').substring(9));
                    }
                    impl.showClue(clueId);
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
                            if (cursorIndex > 1 ||
                                    (cursorIndex > 0 && highlightedTiles
                                        .filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex-1))
                                        .find('div.tile-letter')
                                        .attr(oppDirection) !== 'true')) {
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
                                    .html('&nbsp;')
                                    .find('div.tile-letter')
                                    .not(impl.stringFormat('[{0}=true]', oppDirection))
                                    .remove();
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
                                                .appendTo(highlightedTiles.filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex)).html(''));
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
                                    // Answer filled in - validate it, if appropriate.
                                    if (options.validateAnswer === true) {
                                        var enteredAnswer = '', actualAnswer = '';
                                        // Get the entered answer.
                                        for (i = 0; i < highlightedTiles.length; i++) {
                                            var letter = highlightedTiles
                                                            .filter(impl.stringFormat('[cursorIndex={0}]', i))
                                                            .find('div.tile-letter')
                                                            .text();
                                            enteredAnswer = enteredAnswer.concat(letter);
                                        }

                                        var clueId;
                                        // Across clue is highlighted, look for answer for across clue.
                                        if (direction === 'a') {
                                            clueId = parseInt(highlightedTiles.filter('[cursorIndex=0]').attr('acrossClueId'));
                                        }
                                        else {
                                            // Down clue is highlighted, look for answer for down clue.
                                            clueId = parseInt(highlightedTiles.filter('[cursorIndex=0]').attr('downClueId'));
                                        }

                                        var clue = s.findClueById(clueId);
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
                var findFunc = function (c) { return c.number === number && c.direction === direction };
                var foundClues = this.findClues(findFunc);
                return (foundClues.length === 1) ? foundClues[0] : null;
            },

            findClueById: function (id) {
                return (id < clues.length) ? clues[id] : null;
            },

            findClueByText: function (clueText) {
                var findFunc = function (c) { return c.text === clueText };
                var foundClues = this.findClues(findFunc);
                return (foundClues.length === 1) ? foundClues[0] : null;
            },

            findCluesByDirection: function (direction) {
                var findFunc = function (c) { return c.direction === direction };
                return this.findClues(findFunc);
            },

            findClues: function (findFunc) {
                return $.grep(clues, findFunc);
            },

            appendClues: function (data, onRight) {
                var displayStyle = onRight ? "inline-block" : "block";
                var cluesDiv = $(impl.stringFormat('<div id="clues" class="clues" style="vertical-align: top; display: {0}" />', displayStyle));
                var missingClue = '<span style="color: red;">Missing clue</span>';
                var s = this;

                // Across clues.
                cluesDiv.append('<div class="clue-header">ACROSS</div>');
                var acrossClues = s.findCluesByDirection('a');
                $.each(acrossClues, function (index, clue) {
                    cluesDiv.append(s.stringFormat(
                                    '<div><span><b>{0}</b></span><span id="clueText-{1}" style="cursor: pointer"> {2} {3}</span></div>',
                                    clue.number,
                                    clue.id,
                                    clue.text ? clue.text : missingClue,
                                    clue.pattern ? clue.pattern : ''));
                });

                // Down clues.
                cluesDiv.append('<div class="clue-header">DOWN</div>');
                var downClues = s.findCluesByDirection('d');
                $.each(downClues, function (index, clue) {
                    cluesDiv.append(s.stringFormat(
                                    '<div><span><b>{0}</b></span><span id="clueText-{1}" style="cursor: pointer"> {2} {3}</span></div>',
                                    clue.number,
                                    clue.id,
                                    clue.text ? clue.text : missingClue,
                                    clue.pattern ? clue.pattern : ''));
                });

                var width = onRight ? '' : $('#divGrid').width();
                cluesDiv.outerWidth(width).appendTo(data);
                impl.columniseClues(onRight);
            },

            showClue: function (clueId) {
                // Remove highlighting from previously highlighted tiles.
                $('#grid td.tile-highlight').removeClass('tile-highlight');
                $('#grid td.tile-cursor').removeClass('tile-cursor');
                // Remove highlighting from previously highlighted clue texts.
                $('#clues span.clue-highlight').removeClass('clue-highlight');
                $('#clueBox span').fadeOut('fast');

                clueId = clueId ? clueId : -1;

                if (clueId >= 0) {
                    var clueIds = this.highlightTiles(clueId);

                    $.each(clueIds, function (index, value) {
                        // Highlight corresponding clue text(s).
                        var clue = $(impl.stringFormat('#clues span#clueText-{0}', value)).addClass('clue-highlight');
                        // Put the root clue text into the clue box.
                        if (index === 0) {
                            $('#clueBox span').fadeOut('fast', function () {
                                $('#clueBox span').text(clue.text());
                                $('#clueBox span').fadeIn('fast');
                            });
                        }
                    });
                }
            },

            highlightTiles: function (clueId) {
                var rootClue = null;
                var subClueIds = [];
                cursorIndex = 0;

                rootClue = impl.findClueById(clueId);
                if (rootClue) {
                    if (rootClue.rootClueId >= 0) {
                        rootClue = impl.findClueById(rootClue.rootClueId);
                    }
                    subClueIds = rootClue.subClueIds;
                }

                // Highlight the root clue.
                if (rootClue) {
                    switch (rootClue.direction) {
                        case 'a':
                            // Highlight the across clue.
                            $(impl.stringFormat('#grid td[acrossClueId={0}]', rootClue.id))
                                    .addClass('tile-highlight')
                                    .each(function (index, value) { $(this).attr('cursorIndex', cursorIndex++); });
                            break;

                        case 'd':
                            // Highlight the down clue.
                            $(impl.stringFormat('#grid td[downClueId={0}]', rootClue.id))
                                    .addClass('tile-highlight')
                                    .each(function (index, value) { $(this).attr('cursorIndex', cursorIndex++); });
                            break;
                    }

                    // Also highlight any sub-clues.
                    $.each(subClueIds, function (index, subClueId) {
                        $(impl.stringFormat('#grid td[acrossClueId={0}]', subClueId))
                                .add(impl.stringFormat('#grid td[downClueId={0}]', subClueId))
                                    .addClass('tile-highlight')
                                    .each(function (index, value) { $(this).attr('cursorIndex', cursorIndex++); });
                    });

                    // Find the first highlighted tile without a filled in letter, and put the cursor there.
                    var highlightedTiles = $('#grid td.tile-highlight');
                    cursorIndex = 0;
                    while (cursorIndex < highlightedTiles.length &&
                            highlightedTiles
                                .filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex))
                                .find('div.tile-letter').length > 0) {
                        cursorIndex++;
                    }
                    highlightedTiles
                        .filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex))
                        .addClass('tile-cursor');
                }

                return [rootClue.id].concat(subClueIds);
            },

            columniseClues: function (onRight) {
                var cluesDiv = $('#clues');
                var columnWidth = (cluesDiv.width() / 2) - 5;

                var getNewColumn = function (number) {
                    return $(impl.stringFormat('<div id="col{0}" style="position: relative; display: inline-table; vertical-align: top; width: {1};" />', number, columnWidth));
                }

                var colDivs = [];
                colDivs.push(getNewColumn(0));

                cluesDiv.children('div').each(function () {
                    $(this).remove().appendTo(colDivs[0]);
                });

                cluesDiv.append(colDivs[0]);

                var columnHeight = onRight === true ? $('#divGrid').outerHeight() : colDivs[0].height() / 2;
                var col = 1, done = false;

                while (!done) {
                    var newColumn = false;
                    colDivs[col - 1].children('div').each(function () {
                        // If the clues are on the right, test the bottom of the clue div, else test the top.
                        var extra = onRight ? $(this).height() : 0;
                        if ($(this).position().top + extra > columnHeight) {
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

                cluesDiv.children('div').each(function (index, value) {
                    if (onRight && index === 0) {
                        $(this).css('margin-left', '5px');
                    }
                    if ($(this).attr('id') !== 'col' + (col - 1)) {
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

        $.extend(options, defaultOptions);
        impl.init(data, options);

        return data;
    }

    $.fn.crossword = function (options) {
        return $.crossword(this, options);
    }

})(jQuery);
