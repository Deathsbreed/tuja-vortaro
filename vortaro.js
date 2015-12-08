// vim: set ts=4 sts=4 sw=4 et:
'use strict';

// ES6 polyfill.
if (!String.prototype.includes) {
    String.prototype.includes = function() {
        'use strict';
        return String.prototype.indexOf.apply(this, arguments) !== -1;
    };
}

// Main search function.
function search(term, dict, dict_lower) {
    term = term.trim();
    term = normalize_english(term);
    if (term.length === 0) {
        return [];
    }

    // This breaks for English words with "ux", but... that's OK.
    term = xreplace(term);

    var matchlist = search_exact(term, dict, dict_lower);
    if (matchlist.length !== 0) {
        return matchlist;
    }

    // If no results were found, try fixing input to a standard dictionary form.
    var normalized = normalize_suffix(term);
    if (normalized !== term) {
        return search_exact(normalized, dict, dict_lower);
    }

    return [];
}

// Normalize "to foo" => "foo".
function normalize_english(string) {
    if (string.startsWith('to ')) {
        return string.substr(3);
    }
    return string;
}

// Support the x-system.
function xreplace(text) {
    var pairs = [
        ['cx', 'ĉ'], ['cX', 'ĉ'], ['Cx', 'Ĉ'], ['CX', 'Ĉ'],
        ['gx', 'ĝ'], ['gX', 'ĝ'], ['Gx', 'Ĝ'], ['GX', 'Ĝ'],
        ['hx', 'ĥ'], ['hX', 'ĥ'], ['Hx', 'Ĥ'], ['HX', 'Ĥ'],
        ['jx', 'ĵ'], ['jX', 'ĵ'], ['Jx', 'Ĵ'], ['JX', 'Ĵ'],
        ['sx', 'ŝ'], ['sX', 'ŝ'], ['Sx', 'Ŝ'], ['SX', 'Ŝ'],
        ['ux', 'ŭ'], ['uX', 'ŭ'], ['Ux', 'Ŭ'], ['UX', 'Ŭ']
    ];

    for (var i = 0; i < pairs.length; ++i) {
        text = text.replace(new RegExp(pairs[i][0], 'g'), pairs[i][1]);
    }
    return text;
}

// Given an esperanto word, try to get a standard form.
function normalize_suffix(word) {
    var suffices = [
        ['as', 'i'],
        ['os', 'i'],
        ['is', 'i'],
        ['us', 'i'],
        ['u',  'i'],

        ['oj', 'o'],
        ['ojn', 'o'],
        ['on', 'o'],

        ['aj', 'a'],
        ['ajn', 'a'],
        ['an', 'a'],

        ['en', 'e']
    ];

    for (var i = 0; i < suffices.length; ++i) {
        if (word.endsWith(suffices[i][0])) {
            return word.slice(0, -1 * suffices[i][0].length) + suffices[i][1];
        }
    }

    return word;
}

// Given an esperanto word subject to normal grammar rules, get the root.
function getroot(word) {
    word = normalize_suffix(word);

    // Remove the function indicator.
    var lastchar = word[word.length - 1]
    if (lastchar === 'a' || lastchar === 'i' || lastchar === 'o' || lastchar === 'e') {
        word = word.slice(0, -1);
    }

    // Get out of participle form.
    var suffices = [
        'ant', 'ont', 'int', 'unt', 'at', 'ot', 'it', 'ut'
    ];

    for (var i = 0; i < suffices.length; ++i) {
        if (word.endsWith(suffices[i])) {
            return word.slice(0, -1 * suffices[i].length);
        }
    }

    return word;
}

// Remove a parenthesis pair.
// A search for "paragraph" should return "paragraph (text)".
function remove_parentheses(text) {
    var paren = text.indexOf(' (');
    if (paren === -1) {
        return text;
    }
    if (paren === 0) {
        return text.substr(text.indexOf(')') + 1);
    }
    return text.substr(0, paren);
}

function is_exact_match(entry, search) {
    var v = normalize_english(entry);
    v = remove_parentheses(v);
    return (v === search);
}

// Returns a list of match indices into the dictionary.
function search_exact(word, dict, dict_lower) {
    var matches = [];
    var exactmatches = [];
    var i, j;
    var entry;
    var match = false;
    var exactMatch = false;

    var lowerWord = word.toLowerCase();

    // Find all potentially matching candidates quickly.
    // Does not care whether the entry was in English or Esperanto.
    for (i = 0; i < dict.length; ++i) {
        entry = dict_lower[i];

        match = false;
        exactMatch = false;

        for (j = 0; j < entry.length; ++j) {
            // FirefoxOS 2.2 doesn't support ES6 includes().
            if (entry[j].includes(lowerWord)) {
                match = true;
                exactMatch = is_exact_match(entry[j], lowerWord);
            }
        }

        if (exactMatch === true) {
            exactmatches.push(i);
        }
        if (match === true) {
            matches.push(i);
        }
    }

    if (exactmatches.length !== 0) {
        return exactmatches;
    }

    return matches;
}

// Given an esperanto word, look up an etymology.
function find_etymology(word) {
    // The etymology dictionary is entirely in lowercase.
    var lowerWord = word.toLowerCase();

    // Look for the word directly.
    for (var i = 0; i < etymology.length; ++i) {
        if (etymology[i][0] === lowerWord) {
            return etymology[i][1];
        }
    }

    // If it wasn't found, try to compare roots.
    // We can't do this in the first place because of exceptions.
    // For example, "tri" and "tro" have distinct etymologies.
    var root = getroot(lowerWord);
    for (var i = 0; i < etymology.length; ++i) {
        if (etymology[i][0].slice(0, -1) === root) {
            return etymology[i][1];
        }
    }

    return "";
}
