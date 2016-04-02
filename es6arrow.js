/**
 * This is a small Javascript parser that replaces ES6 arrow functions and ES6-style methods
 * with the corresponding ES5 compatible code.
 * Note: This might not always work, it has been tested with only the .tag files in this project.
 */
(function () {    
    var pairs = { '{':'}', '(':')', '[':']', '"':'"', "'":"'" }; 
    
    // matches "(param1, param2, ..) => " or "param => "
    var arrowRE = /(\(\s*\w*(?:\s*,\s*\w+)*\s*\)|\w+)\s*=>\s*/gim;
    
    // matches "<8char_word> <func_name> (params) {"  
    // Why 8? We need to find out if there's a "function" befor the method name 
    // ("function".length === 8)
    var methodRE = /((\w{8})?\s+)(\w+)\s*(\(\s*\w*(?:\s*,\s*\w+)*\s*\))\s*\{/gim;
    
    // if we find one of these without their opening counterparts we probably hit 
    // the next character after the end of the expression.
    var expressionSeparators = ',;})]';
    
    /**
     * Finds the closing pair of the opening character at position 'pos' in the string 'code'.
     * Returns the index or -1 if it's not found.
     * Correctly matches parenthesis pairs and skips characters inside a string/regex.
     */
    function findMatch(code, pos) {
        var stack = [];         // the stack of closing parenthesis to match in the remaining string
        var inString = false;   // contains the quote character if we're inside a quoted string
        
        do {
            var c = code.charAt(pos++);
            if (inString) {                             // we're inside a string
                if (c === '\\') pos++; else             // skip escaped chars
                if (c === inString) inString = false;   // found the end of the string
            } else {
                if (c === stack[stack.length-1]) {      // found a matching close paren.
                    stack.pop();
                } else if (c === '"' || c === "'") {    // a string starts here
                    inString = c;
                } else if (pairs[c]) {                  // found an open parenthesis
                    stack.push(pairs[c]);
                } else 
                // could be a regex
                // make sure it's not a line comment: "//"
                if (c === '/' && code.charAt(pos) !== '/' && code.charAt(pos-2) !== '/') {
                    for (var end = pos+1; end < code.length; end++) {
                        var c2 = code.charAt(end);
                        if (c2 === '\r' || c2 === '\n') break;  // can't be regex
                        // ending "/" of the regex, if it's not escaped
                        if (c2 === '/' && code.charAt(end-1) !== '\\') {    
                            try {
                                // let's try to compile the regex
                                var rx = new RegExp(code.substring(pos, end));
                                // no errors, we can skip the whole block
                                pos = end+1;
                                break;
                            } catch (err) {}
                        }
                    }
                }
            }
        // exit when the stack is empty and we're not in a string => found the matching pair
        // or when we run out of characters
        } while (pos < code.length && (inString || stack.length > 0));
        
        return inString === false && stack.length === 0 ? pos-1 : -1;
    }
    
    function processJScode(js, url) {
        var finalEdits = [];
        var match;
        
        console.log('[es6arrow] Processing ' + url);
        
        /* Find ES6-style method blocks
         * <pre><code>
         * replace this:
         * myMethod(param1, param1) {
         *   doStuff();
         * }
         * </code></pre>
         * with this:
         * <pre><code>
         * this.myMethod=(function(param1, param2) {
         *   doStuff();
         * }).bind(this);        
         * </code></pre>
         */
        while ((match = methodRE.exec(js))) {
            if (match[2] !== 'function' && !/if|while|for|switch|catch|function/.test(match[3])) {
                // methodRE matches the opening "{", we find the closing one now
                var endPos = findMatch(js, match.index + match[0].length -1);
                if (endPos >= 0) {
                    var namePos = match.index + match[1].length; // function name start pos
                    finalEdits.push(
                        { ins: 'this.', idx: namePos },
                        { ins: '=(function', idx: namePos + match[3].length /* function name end pos */ },
                        { ins: ').bind(this);', idx: endPos+1 /* function block end pos */ }
                    );
                } else {
                    console.log('[es6arrow] Potential syntax error at pos ' + namePos + ' around "'+match[3]+'"');
                }
            }
        }
        
        // Find ES6 arrow functions and replace them with ES5 compatible code 
        while ((match = arrowRE.exec(js))) {
            var edits = [];
            var params = match[1];
            var paramsEndPos = match.index + match[1].length;
            var valuePos = match.index + match[0].length;

            if (params.charAt(0) === '(') {
                params = params.substr(1, params.length-2); 
                edits.push({ idx: match.index, ins: '(function' }, { idx: paramsEndPos, skip:valuePos-paramsEndPos });
            } else {
                edits.push({ idx: match.index, ins: '(function(' }, { idx: paramsEndPos, skip:valuePos-paramsEndPos, ins: ')' });
            }
            params = !params ? [] : params.split(',').map(function (s) { return s.trim(); });
            
            var ok = false;
            var valueEnd;
            if (js.charAt(valuePos) === '{') {
                valueEnd = findMatch(js, valuePos);
                if (valueEnd >= 0) {
                    edits.push({ idx: valueEnd + 1, ins: ').bind(this)' });
                    ok = true;
                }
            } else {
                for (valueEnd = valuePos; valueEnd < js.length; valueEnd++) {
                    var c = js.charAt(valueEnd);
                    if (expressionSeparators.indexOf(c) >= 0) {
                        ok = true;
                        //try to "compile" 
                        
                        try {
                            Function.apply(undefined, params.concat('return ' + js.substring(valuePos, valueEnd)));
                        } catch (err) {
                            ok = false;
                        }
                        
                        if (ok) break;
                    } else if (pairs[c]) {
                        valueEnd = findMatch(js, valueEnd);
                        if (valueEnd === -1) break; // ok === false
                    }
                }
                if (ok) {
                    // "(<params>) => <some_expression>" -> "function(<params>){return <some_expression>}.bind(this)"
                    edits.push({ idx: valuePos, ins: '{return '}, { idx: valueEnd, ins: ';}).bind(this)' });
                }
            }
            if (ok) finalEdits.push.apply(finalEdits, edits); else console.log('[es6arrow] Lambda replacement failed: ', match[0], ' at ', match.index, ' in ', url);
        }
        
        if (finalEdits.length > 0) {                
            finalEdits.sort(function (a, b) { return a.idx - b.idx; });
            
            var processedOffset = 0;
            var results = [];
            
            finalEdits.forEach(function (edit) {
                results.push(js.substring(processedOffset, edit.idx)); 
                processedOffset = edit.idx + (edit.skip || 0);
                if (edit.ins) results.push(edit.ins);
            });
            
            results.push(js.substr(processedOffset));
            
            return results.join('');
        } else {
            return js;
        }
    }
    
    var processor = function (code, options, url) {
        var code2 = processJScode(code, url);
        return code2;
    };
    
    if (typeof module === 'object') module.exports = processor; 
    if (typeof riot === 'object') riot.parsers.js.es6arrow = processor;
})();
