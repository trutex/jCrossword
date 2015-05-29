(function ($) {

    $.crossword = function (data, options) {

        var defaultOptions = {
            colour: 'Black',
            cluesToRight: true,
            clueBox: true,
            validateAnswer: 'none',
            tileSize: 25
        };
        var cursorIndex;
        var clues = [];
        var multiClues = [];
        var impl = {

            init: function (data, options) {
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

                options = $.extend(defaultOptions, options);

                impl.appendGrid(options);
                impl.appendClues(data, options.cluesToRight);
                impl.bindEvents();

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
                var borderStyle = impl.stringFormat('solid 1px {0}', options.colour);

                var grid = $('<table id="cwd-grid" cellSpacing="0" rowSpacing="0"></table>');
                var clueNo = 1;

                var newTile = function(row, col) {
                    return $(impl.stringFormat('<td class="cwd-tile" row="{0}" col="{1}" />', row, col))
                                // Must add at least one space to get borders showing in IE7.
                                .append(
                                    $('<div class="cwd-tile-letter" />').text(' ')
                                );
                }

                // Build the bare grid.
                for (i = 0; i < gridSize.height; i++) {
                    var row = $('<tr />').appendTo(grid);

                    for (j = 0; j < gridSize.width; j++) {
                        var tile = newTile(i, j).appendTo(row);

                        if (typeof (options.gridMask[i]) !== 'undefined' && options.gridMask[i].charAt(j) === ' ') {
                            tile.addClass('cwd-tile-active').css('background-color', 'White');
                        }
                        else {
                            tile.addClass('cwd-tile-inactive').css('background-color', options.colour);
                        }
                    }
                }

                var index = 0, acrossClueIndex = 0, downClueIndex = 0;
                // Iterate through each active tile, adding clue numbers where appropriate and build clue arrays.
                grid.find('td.cwd-tile-active').each(function () {
                    // Work out whether it's a numbered tile
                    var i = parseInt($(this).attr('row')), j = parseInt($(this).attr('col'));

                    // Inactive tile to left (or edge) AND active tile to right => start of across clue.
                    var acrossNo = (j === 0 || options.gridMask[i].charAt(j - 1) !== ' ') &&
                                (j < gridSize.width - 1 && options.gridMask[i].charAt(j + 1) === ' ')

                    // Inactive tile above (or edge) AND active tile below => start of down clue.
                    var downNo = (i === 0 || options.gridMask[i - 1].charAt(j) !== ' ') &&
                                (i < gridSize.height - 1 && options.gridMask[i + 1].charAt(j) === ' ')

                    var row = i, col = j;
                    if (acrossNo) {
                        while (col < gridSize.width) {
                            var thisTile = grid.find(impl.stringFormat('td[row={0}][col={1}]', row, col));
                            if (thisTile.hasClass('cwd-tile-inactive')) {
                                break;
                            }
                            else {
                                thisTile.attr('acrossClueId', index);
                            }
                            col++;
                        }

                        // Build array of clue objects.
                        clues.push(impl.buildClueObject(
                            options.acrossClues[acrossClueIndex], index++, clueNo, (col - j), 'a', (acrossNo && downNo)));
                        acrossClueIndex++;
                    }

                    row = i;
                    col = j;
                    if (downNo) {
                        while (row < gridSize.height) {
                            var thisTile = grid.find(impl.stringFormat('td[row={0}][col={1}]', row, col));
                            if (thisTile.hasClass('cwd-tile-inactive')) {
                                break;
                            }
                            else {
                                thisTile.attr('downClueId', index);
                            }
                            row++;
                        }

                        // Build array of clue objects.
                        clues.push(impl.buildClueObject(
                            options.downClues[downClueIndex], index++, clueNo, (row - i), 'd', (acrossNo && downNo)));
                        downClueIndex++;
                    }

                    if (acrossNo || downNo) {
                        // Add a clue number label to the tile.
                        $(this).prepend(
                            $('<span />')
                                .text(clueNo++)
                                .css({ 'position': 'absolute', 'font-size': options.tileSize / 3 })
                        );
                    }
                });

                // Assign the text to the sub-clues of each multi-clue (e.g. "See 18a").
                $.each(multiClues, function (index, value) {
                    var rootClue = value.clue;
                    $.each(value.multiParts, function (index2, subClueText) {
                        var findText = impl.stringFormat("[[{0}]]", subClueText);
                        var subClue = impl.findClueByText(findText);
                        if (subClue) {
                            subClue.rootClueId = rootClue.id;
                            subClue.text = impl.stringFormat(
                                            "See {0}{1}", rootClue.number, rootClue.bothWays ? rootClue.direction : '');
                            subClue.pattern = null;
                            rootClue.subClueIds.push(subClue.id);
                        }
                    });
                });

                // Attach a clue box?
                var clueBox = options.clueBox === true ?
                        $('<div id="cwd-clue-box" />')
                            .append('<span id="cwd-clue-box-text" />') : '';

                // Add the grid into the DOM.
                
                var container = $('<div />').attr('id', 'cwd-container').appendTo(data);
                
                $('<div id="cwd-divGrid" />')
                    .append(grid)
                    .append(clueBox)
                    .appendTo(container)
                    .css({ display: "inline-block", width: grid.width() });

                    // Align tile letters vertically.
                    $('.cwd-tile-letter').each(function() {
                        $(this).text('A');
                        $(this).css('margin-top', (options.tileSize - $(this).height()) / 2);
                        $(this).text(' ');
                    });
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
                cluePattern = impl.stringFormat("({0})", cluePattern);

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

                $('#cwd-grid td.cwd-tile-active').click(function () {
                    var prevDirection = '';
                    // Record which direction the clue is currently hightlighted in, if any.
                    if ($(this).hasClass('cwd-tile-highlight')) {
                        prevDirection = $(this).prev('td.cwd-tile-active').hasClass('cwd-tile-highlight') ||
                                   $(this).next('td.cwd-tile-active').hasClass('cwd-tile-highlight') ? 'a' : 'd';
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

                $('#cwd-clues .cwd-clue-text').click(function () {
                    var clueId = -1;
                    if (!$(this).hasClass('cwd-clue-highlight')) {
                        clueId = parseInt($(this).attr('id').substring(13));
                    }
                    impl.showClue(clueId);
                });

                $('#cwd-grid td.cwd-tile-active').mousedown(function (event) {
                    //if (event.which === 3) {
                    // Right-click
                    //    alert('rclick');
                    //}
                });

                $(document).keydown(function (event) {
                    var highlightedTiles = $('#cwd-grid td.cwd-tile-highlight');

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
                                        .find('div.cwd-tile-letter')
                                        .attr(oppDirection) !== 'true')) {
                                highlightedTiles.filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex--)).removeClass('cwd-tile-cursor');
                                // Don't delete tile letters that have been filled in as part of another clue.
                                while (cursorIndex > 0 &&
                                    highlightedTiles
                                        .filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex))
                                        .find('div.cwd-tile-letter')
                                        .attr(oppDirection) === 'true') {
                                    cursorIndex--;
                                }
                                highlightedTiles
                                    .filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex))
                                    .addClass('cwd-tile-cursor')
                                    .find('div.cwd-tile-letter')
                                    .not(impl.stringFormat('[{0}=true]', oppDirection))
                                    .text(' ')
                                    .removeAttr(direction);
                                $('.cwd-tile-correct,.cwd-tile-incorrect').removeClass('cwd-tile-correct').removeClass('cwd-tile-incorrect');
                            }
                        }
                        else {
                            // Check for letter (case insensitive).
                            var charEntered = String.fromCharCode(code).toUpperCase();

                            if (/[A-Z]/i.test(charEntered)) {
                                // Write the entered letter into the tile.
                                $('.cwd-tile-letter', highlightedTiles.filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex)))
                                    .text(charEntered)
                                    .attr(direction, 'true');
                                // Move the 'cursor' on.
                                highlightedTiles.filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex++)).removeClass('cwd-tile-cursor');
                                // Move the cursor past any squares that have been written into already.
                                while (cursorIndex < highlightedTiles.length &&
                                    highlightedTiles.filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex)).find('div.cwd-tile-letter').text() !== ' ') {
                                    cursorIndex++;
                                }
                                if (cursorIndex < highlightedTiles.length) {
                                    highlightedTiles.filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex)).addClass('cwd-tile-cursor');
                                }
                                else {
                                    // Answer filled in - validate it, if appropriate.
                                    if (options.validateAnswer === 'clue' || options.validateAnswer === 'grid') {
                                        var enteredAnswer = '', actualAnswer = '';
                                        // Get the entered answer.
                                        for (i = 0; i < highlightedTiles.length; i++) {
                                            var letter = highlightedTiles
                                                            .filter(impl.stringFormat('[cursorIndex={0}]', i))
                                                            .find('div.cwd-tile-letter')
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

                                        var clue = impl.findClueById(clueId);
                                        var tilesToHighlight;
                                        var canValidate = true, correct = true;

                                        // If validate option = 'grid', validate every entered answer when the grid is completed.
                                        // If option = 'clue', validate only the just entered answer.
                                        switch (options.validateAnswer) {
                                            case 'grid':
                                                clue.enteredAnswer = enteredAnswer;

                                                if (impl.isGridCompleted()) {
                                                    $.each(clues, function(index, value) {
                                                        if (clue.answer && clue.enteredAnswer) {
                                                            if (clue.answer.toUpperCase() !== clue.enteredAnswer) {
                                                                correct = false;
                                                            }
                                                        } else {
                                                            canValidate = false;
                                                            return false;
                                                        }
                                                    });

                                                    if (canValidate) {
                                                        tilesToHighlight = $('.cwd-tile-active');
                                                    }
                                                }
                                                break;

                                            case 'clue':
                                                tilesToHighlight = highlightedTiles;
                                                if (clue.answer) {
                                                    canValidate = true;
                                                    correct = (clue.answer.toUpperCase() === enteredAnswer);
                                                }
                                                break;
                                        }

                                        if (canValidate) {
                                            if (correct) {
                                                tilesToHighlight.addClass('cwd-tile-correct');
                                                setTimeout(function() {
                                                tilesToHighlight.removeClass('cwd-tile-correct');
                                                }, 1500);
                                            } else {
                                                tilesToHighlight.addClass('cwd-tile-incorrect');
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

            isGridCompleted: function() {
                // Return true if all active tiles have a letter entered into them.
                return $('.cwd-tile-active').find('.cwd-tile-letter').filter(function() {
                    return $(this).text() === ' ';
                }).length === 0;
            },

            findClueByNumber: function (clueNo, direction) {
                var number = clueNo;
                if (typeof (number) === 'string') {
                    number = parseInt(number);
                }
                var findFunc = function (c) { return c.number === number && c.direction === direction };
                var foundClues = impl.findClues(findFunc);
                return (foundClues.length === 1) ? foundClues[0] : null;
            },

            findClueById: function (id) {
                return (id < clues.length) ? clues[id] : null;
            },

            findClueByText: function (clueText) {
                var findFunc = function (c) { return c.text === clueText };
                var foundClues = impl.findClues(findFunc);
                return (foundClues.length === 1) ? foundClues[0] : null;
            },

            findCluesByDirection: function (direction) {
                var findFunc = function (c) { return c.direction === direction };
                return impl.findClues(findFunc);
            },

            findClues: function (findFunc) {
                return $.grep(clues, findFunc);
            },

            appendClues: function (data, onRight) {
                var displayStyle = onRight ? "inline-block" : "block";
                var cluesDiv = $(impl.stringFormat('<div id="cwd-clues" style="vertical-align: top; display: {0}" />', displayStyle));
                var missingClue = '<span style="color: red;">Missing clue</span>';
                var clueHeader = function(label) {
                    return $('<div />').addClass('cwd-clues-header').text(label);
                };

                var addClues = function(clueArray) {
                    $.each(clueArray, function (index, clue) {
                        cluesDiv.append(impl.stringFormat(
                                        '<div class="cwd-clue"><div class="cwd-clue-no"><b>{0}</b></div><div id="cwd-clueText-{1}" class="cwd-clue-text"> {2} {3}</div></div>',
                                        clue.number,
                                        clue.id,
                                        clue.text ? clue.text : missingClue,
                                        clue.pattern ? clue.pattern : ''));
                    });
                };

                // Across clues.
                clueHeader('ACROSS').appendTo(cluesDiv);
                var acrossClues = impl.findCluesByDirection('a');
                addClues(acrossClues);

                // Down clues.
                clueHeader('DOWN').appendTo(cluesDiv);
                var downClues = impl.findCluesByDirection('d');
                addClues(downClues);

                var width = onRight ? '' : $('#cwd-divGrid').width();
                cluesDiv.outerWidth(width).appendTo($('#cwd-container'));
                impl.columniseClues(onRight);
            },

            showClue: function (clueId) {
                // Remove highlighting from previously highlighted tiles.
                $('#cwd-grid td.cwd-tile-highlight').removeClass('cwd-tile-highlight');
                $('#cwd-grid td.cwd-tile-cursor').removeClass('cwd-tile-cursor');
                // Remove highlighting from previously highlighted clue texts.
                $('#cwd-clues span.cwd-clue-highlight').removeClass('cwd-clue-highlight');
                $('#cwd-clue-box-text').fadeOut('fast');

                clueId = clueId ? clueId : -1;

                if (clueId >= 0) {
                    var clueIds = impl.highlightTiles(clueId);

                    $('.cwd-clue-highlight').removeClass('cwd-clue-highlight');
                    $.each(clueIds, function (index, value) {
                        // Highlight corresponding clue text(s).
                        var clue = $(impl.stringFormat('#cwd-clues #cwd-clueText-{0}', value)).addClass('cwd-clue-highlight');
                        // Put the root clue text into the clue box.
                        if (index === 0) {
                            $('#cwd-clue-box-text').fadeOut('fast', function () {
                                $('#cwd-clue-box-text').text(clue.text());
                                $('#cwd-clue-box-text').fadeIn('fast');
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
                            $(impl.stringFormat('#cwd-grid td[acrossClueId={0}]', rootClue.id))
                                    .addClass('cwd-tile-highlight')
                                    .each(function (index, value) { $(this).attr('cursorIndex', cursorIndex++); });
                            break;

                        case 'd':
                            // Highlight the down clue.
                            $(impl.stringFormat('#cwd-grid td[downClueId={0}]', rootClue.id))
                                    .addClass('cwd-tile-highlight')
                                    .each(function (index, value) { $(this).attr('cursorIndex', cursorIndex++); });
                            break;
                    }

                    // Also highlight any sub-clues.
                    $.each(subClueIds, function (index, subClueId) {
                        $(impl.stringFormat('#cwd-grid td[acrossClueId={0}]', subClueId))
                                .add(impl.stringFormat('#cwd-grid td[downClueId={0}]', subClueId))
                                    .addClass('cwd-tile-highlight')
                                    .each(function (index, value) { $(this).attr('cursorIndex', cursorIndex++); });
                    });

                    // Find the first highlighted tile without a filled in letter, and put the cursor there.
                    var highlightedTiles = $('#cwd-grid td.cwd-tile-highlight');
                    cursorIndex = 0;
                    while (cursorIndex < highlightedTiles.length &&
                            highlightedTiles
                                .filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex))
                                .find('div.cwd-tile-letter').text() !== ' ') {
                        cursorIndex++;
                    }
                    highlightedTiles
                        .filter(impl.stringFormat('[cursorIndex={0}]', cursorIndex))
                        .addClass('cwd-tile-cursor');
                }

                return [rootClue.id].concat(subClueIds);
            },

            columniseClues: function (onRight) {
                var cluesDiv = $('#cwd-clues');
                var columnWidth = (cluesDiv.width() / 2) - 5;

                var getNewColumn = function (number) {
                    return $(impl.stringFormat('<div id="cwd-col{0}" style="position: relative; display: inline-table; vertical-align: top; width: {1};" />', number, columnWidth));
                }

                var colDivs = [];
                colDivs.push(getNewColumn(0));

                cluesDiv.children('div').each(function () {
                    $(this).remove().appendTo(colDivs[0]);
                });

                cluesDiv.append(colDivs[0]);

                var columnHeight = onRight === true ? $('#cwd-divGrid').outerHeight() : colDivs[0].height() / 2;
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

        impl.init(data, options);

        return data;
    }

    $.fn.crossword = function (options) {
        return $.crossword(this, options);
    }

})(jQuery);
