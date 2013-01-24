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
                data.hide();

                var grid = s.buildGrid(options);

                data.append(grid);

                s.bindEvents();

                s.appendClues(data);

                data.fadeIn('slow');
                $('#clues').columnize({ columns: 2 });

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

            appendClues: function (data) {
                // Attach a clue box.
                var clueBoxDiv = $('<div id="clueBox" class="clue-box"><span id="clueBoxText"></span></div');
                data.append(clueBoxDiv);
                clueBoxDiv.outerWidth(data.outerWidth());

                var cluesDiv = $('<div id="clues" class="clues" />');
                var missingClue = '<span style="color: red;">Missing clue</span>';
                var s = this;

                // Across clues.
                cluesDiv.append('<div class="clue-header">ACROSS</div>');
                $.each(acrossClues, function (index, clue) {
                    cluesDiv.append(s.stringFormat(
                                    '<div class="dontsplit"><span><b>{0}</b></span><span id="{0}a"> {1} {2}</span></div>',
                                    clue.number,
                                    clue.text ? clue.text : missingClue,
                                    clue.pattern ? clue.pattern : ''));
                });

                // Down clues.
                cluesDiv.append('<div class="clue-header dontend">DOWN</div>');
                $.each(downClues, function (index, clue) {
                    cluesDiv.append(s.stringFormat(
                                    '<div class="dontsplit"><span><b>{0}</b></span><span id="{0}d"> {1} {2}</span></div>',
                                    clue.number,
                                    clue.text ? clue.text : missingClue,
                                    clue.pattern ? clue.pattern : ''));
                });

                cluesDiv.outerWidth(data.outerWidth());
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
                            .each(function(index, value) { $(this).attr('cursorIndex', cursorIndex++); });
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
                                .each(function(index, value) { $(this).attr('cursorIndex', cursorIndex++); });
                        highlightedClue = downClueNo + 'd';

                        var rootClue = s.findClueByNumber(downClueNo, 'd');
                        if (rootClue) {
                            subClues = rootClue.subClues;
                        }
                    }
                }

                var multiTiles = $();
                // Also highlight any sub-clues.
                $.each(subClues, function (index, subClue) {
                    switch (subClue.direction) {
                        case 'a':
                           $(s.stringFormat('#grid td[acrossClueNo={0}]', subClue.number)).addClass('tile-highlight')
                                    .each(function(index, value) { $(this).attr('cursorIndex', cursorIndex++); });
                            break;
                        case 'd':
                           $(s.stringFormat('#grid td[downClueNo={0}]', subClue.number)).addClass('tile-highlight')
                                    .each(function(index, value) { $(this).attr('cursorIndex', cursorIndex++); });
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

        // version 1.6.0
        // http://welcome.totheinter.net/columnizer-jquery-plugin/
        // created by: Adam Wulf @adamwulf, adam.wulf@gmail.com

        $.fn.columnize = function (options) {


            var defaults = {
                // default width of columns
                width: 400,
                // optional # of columns instead of width
                columns: false,
                // true to build columns once regardless of window resize
                // false to rebuild when content box changes bounds
                buildOnce: false,
                // an object with options if the text should overflow
                // it's container if it can't fit within a specified height
                overflow: false,
                // this function is called after content is columnized
                doneFunc: function () { },
                // if the content should be columnized into a 
                // container node other than it's own node
                target: false,
                // re-columnizing when images reload might make things
                // run slow. so flip this to true if it's causing delays
                ignoreImageLoading: true,
                // should columns float left or right
                columnFloat: "left",
                // ensure the last column is never the tallest column
                lastNeverTallest: false,
                // (int) the minimum number of characters to jump when splitting
                // text nodes. smaller numbers will result in higher accuracy
                // column widths, but will take slightly longer
                accuracy: false,
                // don't automatically layout columns, only use manual columnbreak
                manualBreaks: false,
                // previx for all the CSS classes used by this plugin
                // default to empty string for backwards compatibility
                cssClassPrefix: ""
            };
            var options = $.extend(defaults, options);

            if (typeof (options.width) == "string") {
                options.width = parseInt(options.width);
                if (isNaN(options.width)) {
                    options.width = defaults.width;
                }
            }

            return this.each(function () {
                var $inBox = options.target ? $(options.target) : $(this);
                var maxHeight = $(this).height();
                var $cache = $('<div></div>'); // this is where we'll put the real content
                var lastWidth = 0;
                var columnizing = false;
                var manualBreaks = options.manualBreaks;
                var cssClassPrefix = defaults.cssClassPrefix;
                if (typeof (options.cssClassPrefix) == "string") {
                    cssClassPrefix = options.cssClassPrefix;
                }


                var adjustment = 0;

                $cache.append($(this).contents().clone(true));

                // images loading after dom load
                // can screw up the column heights,
                // so recolumnize after images load
                if (!options.ignoreImageLoading && !options.target) {
                    if (!$inBox.data("imageLoaded")) {
                        $inBox.data("imageLoaded", true);
                        if ($(this).find("img").length > 0) {
                            // only bother if there are
                            // actually images...
                            var func = function ($inBox, $cache) {
                                return function () {
                                    if (!$inBox.data("firstImageLoaded")) {
                                        $inBox.data("firstImageLoaded", "true");
                                        $inBox.empty().append($cache.children().clone(true));
                                        $inBox.columnize(options);
                                    }
                                }
                            } ($(this), $cache);
                            $(this).find("img").one("load", func);
                            $(this).find("img").one("abort", func);
                            return;
                        }
                    }
                }

                $inBox.empty();

                columnizeIt();

                if (!options.buildOnce) {
                    $(window).resize(function () {
                        if (!options.buildOnce && $.browser.msie) {
                            if ($inBox.data("timeout")) {
                                clearTimeout($inBox.data("timeout"));
                            }
                            $inBox.data("timeout", setTimeout(columnizeIt, 200));
                        } else if (!options.buildOnce) {
                            columnizeIt();
                        } else {
                            // don't rebuild
                        }
                    });
                }

                function prefixTheClassName(className, withDot) {
                    var dot = withDot ? "." : "";
                    if (cssClassPrefix.length) {
                        return dot + cssClassPrefix + "-" + className;
                    }
                    return dot + className;
                }


                /**
                * this fuction builds as much of a column as it can without
                * splitting nodes in half. If the last node in the new column
                * is a text node, then it will try to split that text node. otherwise
                * it will leave the node in $pullOutHere and return with a height
                * smaller than targetHeight.
                * 
                * Returns a boolean on whether we did some splitting successfully at a text point
                * (so we know we don't need to split a real element). return false if the caller should
                * split a node if possible to end this column.
                *
                * @param putInHere, the jquery node to put elements into for the current column
                * @param $pullOutHere, the jquery node to pull elements out of (uncolumnized html)
                * @param $parentColumn, the jquery node for the currently column that's being added to
                * @param targetHeight, the ideal height for the column, get as close as we can to this height
                */
                function columnize($putInHere, $pullOutHere, $parentColumn, targetHeight) {
                    //
                    // add as many nodes to the column as we can,
                    // but stop once our height is too tall
                    while ((manualBreaks || $parentColumn.height() < targetHeight) &&
                  $pullOutHere[0].childNodes.length) {
                        var node = $pullOutHere[0].childNodes[0]
                        //
                        // Because we're not cloning, jquery will actually move the element"
                        // http://welcome.totheinter.net/2009/03/19/the-undocumented-life-of-jquerys-append/
                        if ($(node).find(prefixTheClassName("columnbreak", true)).length) {
                            //
                            // our column is on a column break, so just end here
                            return;
                        }
                        if ($(node).hasClass(prefixTheClassName("columnbreak"))) {
                            //
                            // our column is on a column break, so just end here
                            return;
                        }
                        $putInHere.append(node);
                    }
                    if ($putInHere[0].childNodes.length == 0) return;

                    // now we're too tall, so undo the last one
                    var kids = $putInHere[0].childNodes;
                    var lastKid = kids[kids.length - 1];
                    $putInHere[0].removeChild(lastKid);
                    var $item = $(lastKid);

                    //
                    // now lets try to split that last node
                    // to fit as much of it as we can into this column
                    if ($item[0].nodeType == 3) {
                        // it's a text node, split it up
                        var oText = $item[0].nodeValue;
                        var counter2 = options.width / 18;
                        if (options.accuracy)
                            counter2 = options.accuracy;
                        var columnText;
                        var latestTextNode = null;
                        while ($parentColumn.height() < targetHeight && oText.length) {
                            var indexOfSpace = oText.indexOf(' ', counter2);
                            if (indexOfSpace != -1) {
                                columnText = oText.substring(0, oText.indexOf(' ', counter2));
                            } else {
                                columnText = oText;
                            }
                            latestTextNode = document.createTextNode(columnText);
                            $putInHere.append(latestTextNode);

                            if (oText.length > counter2 && indexOfSpace != -1) {
                                oText = oText.substring(indexOfSpace);
                            } else {
                                oText = "";
                            }
                        }
                        if ($parentColumn.height() >= targetHeight && latestTextNode != null) {
                            // too tall :(
                            $putInHere[0].removeChild(latestTextNode);
                            oText = latestTextNode.nodeValue + oText;
                        }
                        if (oText.length) {
                            $item[0].nodeValue = oText;
                        } else {
                            return false; // we ate the whole text node, move on to the next node
                        }
                    }

                    if ($pullOutHere.contents().length) {
                        $pullOutHere.prepend($item);
                    } else {
                        $pullOutHere.append($item);
                    }

                    return $item[0].nodeType == 3;
                }

                /**
                * Split up an element, which is more complex than splitting text. We need to create 
                * two copies of the element with it's contents divided between each
                */
                function split($putInHere, $pullOutHere, $parentColumn, targetHeight) {
                    if ($putInHere.contents(":last").find(prefixTheClassName("columnbreak", true)).length) {
                        //
                        // our column is on a column break, so just end here
                        return;
                    }
                    if ($putInHere.contents(":last").hasClass(prefixTheClassName("columnbreak"))) {
                        //
                        // our column is on a column break, so just end here
                        return;
                    }
                    if ($pullOutHere.contents().length) {
                        var $cloneMe = $pullOutHere.contents(":first");
                        //
                        // make sure we're splitting an element
                        if ($cloneMe.get(0).nodeType != 1) return;

                        //
                        // clone the node with all data and events
                        var $clone = $cloneMe.clone(true);
                        //
                        // need to support both .prop and .attr if .prop doesn't exist.
                        // this is for backwards compatibility with older versions of jquery.
                        if ($cloneMe.hasClass(prefixTheClassName("columnbreak"))) {
                            //
                            // ok, we have a columnbreak, so add it into
                            // the column and exit
                            $putInHere.append($clone);
                            $cloneMe.remove();
                        } else if (manualBreaks) {
                            // keep adding until we hit a manual break
                            $putInHere.append($clone);
                            $cloneMe.remove();
                        } else if ($clone.get(0).nodeType == 1 && !$clone.hasClass(prefixTheClassName("dontend"))) {
                            $putInHere.append($clone);
                            if ($clone.is("img") && $parentColumn.height() < targetHeight + 20) {
                                //
                                // we can't split an img in half, so just add it
                                // to the column and remove it from the pullOutHere section
                                $cloneMe.remove();
                            } else if (!$cloneMe.hasClass(prefixTheClassName("dontsplit")) && $parentColumn.height() < targetHeight + 20) {
                                //
                                // pretty close fit, and we're not allowed to split it, so just
                                // add it to the column, remove from pullOutHere, and be done
                                $cloneMe.remove();
                            } else if ($clone.is("img") || $cloneMe.hasClass(prefixTheClassName("dontsplit"))) {
                                //
                                // it's either an image that's too tall, or an unsplittable node
                                // that's too tall. leave it in the pullOutHere and we'll add it to the 
                                // next column
                                $clone.remove();
                            } else {
                                //
                                // ok, we're allowed to split the node in half, so empty out
                                // the node in the column we're building, and start splitting
                                // it in half, leaving some of it in pullOutHere
                                $clone.empty();
                                if (!columnize($clone, $cloneMe, $parentColumn, targetHeight)) {
                                    // this node still has non-text nodes to split
                                    // add the split class and then recur
                                    $cloneMe.addClass(prefixTheClassName("split"));
                                    if ($cloneMe.children().length) {
                                        split($clone, $cloneMe, $parentColumn, targetHeight);
                                    }
                                } else {
                                    // this node only has text node children left, add the
                                    // split class and move on.
                                    $cloneMe.addClass(prefixTheClassName("split"));
                                }
                                if ($clone.get(0).childNodes.length == 0) {
                                    // it was split, but nothing is in it :(
                                    $clone.remove();
                                }
                            }
                        }
                    }
                }


                function singleColumnizeIt() {
                    if ($inBox.data("columnized") && $inBox.children().length == 1) {
                        return;
                    }
                    $inBox.data("columnized", true);
                    $inBox.data("columnizing", true);

                    $inBox.empty();
                    $inBox.append($("<div class='"
             + prefixTheClassName("first") + " "
             + prefixTheClassName("last") + " "
             + prefixTheClassName("column") + " "
             + "' style='width:100%; float: " + options.columnFloat + ";'></div>")); //"
                    $col = $inBox.children().eq($inBox.children().length - 1);
                    $destroyable = $cache.clone(true);
                    if (options.overflow) {
                        targetHeight = options.overflow.height;
                        columnize($col, $destroyable, $col, targetHeight);
                        // make sure that the last item in the column isn't a "dontend"
                        if (!$destroyable.contents().find(":first-child").hasClass(prefixTheClassName("dontend"))) {
                            split($col, $destroyable, $col, targetHeight);
                        }

                        while ($col.contents(":last").length && checkDontEndColumn($col.contents(":last").get(0))) {
                            var $lastKid = $col.contents(":last");
                            $lastKid.remove();
                            $destroyable.prepend($lastKid);
                        }

                        var html = "";
                        var div = document.createElement('DIV');
                        while ($destroyable[0].childNodes.length > 0) {
                            var kid = $destroyable[0].childNodes[0];
                            if (kid.attributes) {
                                for (var i = 0; i < kid.attributes.length; i++) {
                                    if (kid.attributes[i].nodeName.indexOf("jQuery") == 0) {
                                        kid.removeAttribute(kid.attributes[i].nodeName);
                                    }
                                }
                            }
                            div.innerHTML = "";
                            div.appendChild($destroyable[0].childNodes[0]);
                            html += div.innerHTML;
                        }
                        var overflow = $(options.overflow.id)[0];
                        overflow.innerHTML = html;

                    } else {
                        $col.append($destroyable);
                    }
                    $inBox.data("columnizing", false);

                    if (options.overflow && options.overflow.doneFunc) {
                        options.overflow.doneFunc();
                    }

                }

                /**
                * returns true if the input dom node
                * should not end a column.
                * returns false otherwise
                */
                function checkDontEndColumn(dom) {
                    if (dom.nodeType == 3) {
                        // text node. ensure that the text
                        // is not 100% whitespace
                        if (/^\s+$/.test(dom.nodeValue)) {
                            //
                            // ok, it's 100% whitespace,
                            // so we should return checkDontEndColumn
                            // of the inputs previousSibling
                            if (!dom.previousSibling) return false;
                            return checkDontEndColumn(dom.previousSibling);
                        }
                        return false;
                    }
                    if (dom.nodeType != 1) return false;
                    if ($(dom).hasClass(prefixTheClassName("dontend"))) return true;
                    if (dom.childNodes.length == 0) return false;
                    return checkDontEndColumn(dom.childNodes[dom.childNodes.length - 1]);
                }



                function columnizeIt() {
                    //reset adjustment var
                    adjustment = 0;
                    if (lastWidth == $inBox.width()) return;
                    lastWidth = $inBox.width();

                    var numCols = Math.round($inBox.width() / options.width);
                    var optionWidth = options.width;
                    var optionHeight = options.height;
                    if (options.columns) numCols = options.columns;
                    if (manualBreaks) {
                        numCols = $cache.find(prefixTheClassName("columnbreak", true)).length + 1;
                        optionWidth = false;
                    }

                    //          if ($inBox.data("columnized") && numCols == $inBox.children().length) {
                    //              return;
                    //          }
                    if (numCols <= 1) {
                        return singleColumnizeIt();
                    }
                    if ($inBox.data("columnizing")) return;
                    $inBox.data("columnized", true);
                    $inBox.data("columnizing", true);

                    $inBox.empty();
                    $inBox.append($("<div style='width:" + (Math.floor(100 / numCols)) + "%; float: " + options.columnFloat + ";'></div>")); //"
                    $col = $inBox.children(":last");
                    $col.append($cache.clone());
                    maxHeight = $col.height();
                    $inBox.empty();

                    var targetHeight = maxHeight / numCols;
                    var firstTime = true;
                    var maxLoops = 3;
                    var scrollHorizontally = false;
                    if (options.overflow) {
                        maxLoops = 1;
                        targetHeight = options.overflow.height;
                    } else if (optionHeight && optionWidth) {
                        maxLoops = 1;
                        targetHeight = optionHeight;
                        scrollHorizontally = true;
                    }

                    //
                    // We loop as we try and workout a good height to use. We know it initially as an average 
                    // but if the last column is higher than the first ones (which can happen, depending on split
                    // points) we need to raise 'adjustment'. We try this over a few iterations until we're 'solid'.
                    //
                    // also, lets hard code the max loops to 20. that's /a lot/ of loops for columnizer,
                    // and should keep run aways in check. if somehow someone has content combined with
                    // options that would cause an infinite loop, then this'll definitely stop it.
                    for (var loopCount = 0; loopCount < maxLoops && maxLoops < 20; loopCount++) {
                        $inBox.empty();
                        var $destroyable;
                        try {
                            $destroyable = $cache.clone(true);
                        } catch (e) {
                            // jquery in ie6 can't clone with true
                            $destroyable = $cache.clone();
                        }
                        $destroyable.css("visibility", "hidden");
                        // create the columns
                        for (var i = 0; i < numCols; i++) {
                            /* create column */
                            var className = (i == 0) ? prefixTheClassName("first") : "";
                            className += " " + prefixTheClassName("column");
                            var className = (i == numCols - 1) ? (prefixTheClassName("last") + " " + className) : className;
                            $inBox.append($("<div class='" + className + "' style='width:" + (Math.floor(100 / numCols)) + "%; float: " + options.columnFloat + ";'></div>")); //"
                        }

                        // fill all but the last column (unless overflowing)
                        var i = 0;
                        while (i < numCols - (options.overflow ? 0 : 1) || scrollHorizontally && $destroyable.contents().length) {
                            if ($inBox.children().length <= i) {
                                // we ran out of columns, make another
                                $inBox.append($("<div class='" + className + "' style='width:" + (Math.floor(100 / numCols)) + "%; float: " + options.columnFloat + ";'></div>")); //"
                            }
                            var $col = $inBox.children().eq(i);
                            if (scrollHorizontally) {
                                $col.width(optionWidth + "px");
                            }
                            columnize($col, $destroyable, $col, targetHeight);
                            // make sure that the last item in the column isn't a "dontend"
                            split($col, $destroyable, $col, targetHeight);

                            while ($col.contents(":last").length && checkDontEndColumn($col.contents(":last").get(0))) {
                                var $lastKid = $col.contents(":last");
                                $lastKid.remove();
                                $destroyable.prepend($lastKid);
                            }
                            i++;

                            //
                            // https://github.com/adamwulf/Columnizer-jQuery-Plugin/issues/47
                            //
                            // check for infinite loop.
                            //
                            // this could happen when a dontsplit or dontend item is taller than the column
                            // we're trying to build, and its never actually added to a column.
                            //
                            // this results in empty columns being added with the dontsplit item
                            // perpetually waiting to get put into a column. lets force the issue here
                            if ($col.contents().length == 0 && $destroyable.contents().length) {
                                //
                                // ok, we're building zero content columns. this'll happen forever
                                // since nothing can ever get taken out of destroyable.
                                //
                                // to fix, lets put 1 item from destroyable into the empty column
                                // before we iterate
                                $col.append($destroyable.contents(":first"));
                            } else if (i == numCols - (options.overflow ? 0 : 1) && !options.overflow) {
                                //
                                // ok, we're about to exit the while loop because we're done with all
                                // columns except the last column.
                                //
                                // if $destroyable still has columnbreak nodes in it, then we need to keep
                                // looping and creating more columns.
                                if ($destroyable.find(prefixTheClassName("columnbreak", true)).length) {
                                    numCols++;
                                }
                            }

                        }
                        if (options.overflow && !scrollHorizontally) {
                            var IE6 = false/*@cc_on || @_jscript_version < 5.7@*/;
                            var IE7 = (document.all) && (navigator.appVersion.indexOf("MSIE 7.") != -1);
                            if (IE6 || IE7) {
                                var html = "";
                                var div = document.createElement('DIV');
                                while ($destroyable[0].childNodes.length > 0) {
                                    var kid = $destroyable[0].childNodes[0];
                                    for (var i = 0; i < kid.attributes.length; i++) {
                                        if (kid.attributes[i].nodeName.indexOf("jQuery") == 0) {
                                            kid.removeAttribute(kid.attributes[i].nodeName);
                                        }
                                    }
                                    div.innerHTML = "";
                                    div.appendChild($destroyable[0].childNodes[0]);
                                    html += div.innerHTML;
                                }
                                var overflow = $(options.overflow.id)[0];
                                overflow.innerHTML = html;
                            } else {
                                $(options.overflow.id).empty().append($destroyable.contents().clone(true));
                            }
                        } else if (!scrollHorizontally) {
                            // the last column in the series
                            $col = $inBox.children().eq($inBox.children().length - 1);
                            while ($destroyable.contents().length) $col.append($destroyable.contents(":first"));
                            var afterH = $col.height();
                            var diff = afterH - targetHeight;
                            var totalH = 0;
                            var min = 10000000;
                            var max = 0;
                            var lastIsMax = false;
                            var numberOfColumnsThatDontEndInAColumnBreak = 0;
                            $inBox.children().each(function ($inBox) {
                                return function ($item) {
                                    var $col = $inBox.children().eq($item);
                                    var endsInBreak = $col.children(":last").find(prefixTheClassName("columnbreak", true)).length;
                                    if (!endsInBreak) {
                                        var h = $col.height();
                                        lastIsMax = false;
                                        totalH += h;
                                        if (h > max) {
                                            max = h;
                                            lastIsMax = true;
                                        }
                                        if (h < min) min = h;
                                        numberOfColumnsThatDontEndInAColumnBreak++;
                                    }
                                }
                            } ($inBox));

                            var avgH = totalH / numberOfColumnsThatDontEndInAColumnBreak;
                            if (totalH == 0) {
                                //
                                // all columns end in a column break,
                                // so we're done here
                                loopCount = maxLoops;
                            } else if (options.lastNeverTallest && lastIsMax) {
                                // the last column is the tallest
                                // so allow columns to be taller
                                // and retry
                                //
                                // hopefully this'll mean more content fits into
                                // earlier columns, so that the last column
                                // can be shorter than the rest
                                adjustment += 30;

                                targetHeight = targetHeight + 30;
                                if (loopCount == maxLoops - 1) maxLoops++;
                            } else if (max - min > 30) {
                                // too much variation, try again
                                targetHeight = avgH + 30;
                            } else if (Math.abs(avgH - targetHeight) > 20) {
                                // too much variation, try again
                                targetHeight = avgH;
                            } else {
                                // solid, we're done
                                loopCount = maxLoops;
                            }
                        } else {
                            // it's scrolling horizontally, fix the width/classes of the columns
                            $inBox.children().each(function (i) {
                                $col = $inBox.children().eq(i);
                                $col.width(optionWidth + "px");
                                if (i == 0) {
                                    $col.addClass(prefixTheClassName("first"));
                                } else if (i == $inBox.children().length - 1) {
                                    $col.addClass(prefixTheClassName("last"));
                                } else {
                                    $col.removeClass(prefixTheClassName("first"));
                                    $col.removeClass(prefixTheClassName("last"));
                                }
                            });
                            $inBox.width($inBox.children().length * optionWidth + "px");
                        }
                        $inBox.append($("<br style='clear:both;'>"));
                    }
                    $inBox.find(prefixTheClassName("column", true)).find(":first" + prefixTheClassName("removeiffirst", true)).remove();
                    $inBox.find(prefixTheClassName("column", true)).find(':last' + prefixTheClassName("removeiflast", true)).remove();
                    $inBox.data("columnizing", false);

                    if (options.overflow) {
                        options.overflow.doneFunc();
                    }
                    options.doneFunc();
                }
            });
        };

        impl.init(data, options);

        return data;
    }

    $.fn.crossword = function (options) {
        return $.crossword(this, options);
    }

})(jQuery);
