(function () {
    var obj2str = Object.prototype.toString;

    function isObject(arg) {
        return obj2str.call(arg) === '[object Object]';
    }

    function isArray(arg) {
        return Array.isArray ? Array.isArray(arg) : obj2str.call(arg) === '[object Object]';
    }

    var NODIFF_OBJ = {};  // a special object representing "No Difference" 
    
    /**
     * Diff table for different source/target types.
     * `target` = same value as target
     * ND = No Diff (NODIFF_OBJ)
     *
     * | souce\target | null/undef | primitive | { object } |  [ array ]   |
     * +--------------+------------+-----------+------------+--------------+
     * |  null/undef  |  target/ND |  target   |   target   |    target    |
     * |  primitive   |   target   | target/ND |   target   |    target    |
     * |  { object }  |   target   |  target   |  {diff}/ND |    target    |
     * |  [ array ]   |   target   |  target   |   target   |{$_arrDiff}/ND|
     *
     */        
    function getDiff(source, target) {
        if (target === source) {
            return NODIFF_OBJ;
        }
        
        if (isArray(source) && isArray(target)) {
            return arrayDiff(source, target);
        } else if (isObject(source) && isObject(target)) {
            return objDiff(source, target);
        }
        return target;
    }

    function objDiff(source, target) {
        var sourceKeyMap = Object.keys(source).reduce(function (obj, prop) { obj[prop] = true; return obj; }, {});
        
        var diff = null;
        for (var key in target) if (target.hasOwnProperty(key)) {
            if (source[key] !== target[key]) {
                var val = getDiff(source[key], target[key]);
                if (val !== NODIFF_OBJ) {
                    diff = diff || {};
                    diff[key] = val;
                }
            }
            sourceKeyMap[key] = false;
        }
        
        var removed = Object.keys(sourceKeyMap).filter(function (prop) { return sourceKeyMap[prop]; });
        if (removed.length) {
            diff = diff || {};
            diff.$_removed = removed;
        }
        
        return diff || NODIFF_OBJ;
    }

    function getHasFuncField(array, idField) {
        var hasId = null;
        return function (item) { 
            if (!hasId) {
                hasId = {};
                array.forEach(function (item) { hasId[item[idField]] = (hasId[item[idField]] || 0) + 1; });
            }
            return hasId[item[idField]]-- > 0;
        };
    }

    function getHasFuncRef(array) {
        var copy = null;
        return function (item) { 
            copy = copy || array.slice();
            var idx = copy.indexOf(item);
            if (idx >= 0) {
                copy.splice(idx, 1);
                return true;
            }
            return false;
        };
    }

    function arrayDiff(source, target) {
        var src = source.slice();  // clone the source array
        var trgt = target.slice(); // clone target 

        var targetHas, srcHas, same, getIdxInSrc;
        var idField = target.$_idField;
        
        if (idField) {  // items are identified by a field
            targetHas = getHasFuncField(target, idField);                
            srcHas = getHasFuncField(src, idField);
            same = function (a, b) { return a[idField] === b[idField]; };
            getIdxInSrc = function (item, startIdx) {
                var itemID = item[idField];
                for (var i = startIdx; i < src.length; ++i) if (src[i][idField] === itemID) return i;
                return -1;
            };
        } else {    // identity is the reference
            targetHas = getHasFuncRef(target);
            srcHas = getHasFuncRef(src);
            same = function (a, b) { return a === b; };
            getIdxInSrc = [].indexOf.bind(src);
        }
        
        var remove = [];
        for (var i = src.length-1; i >= 0; --i) {
            if (!targetHas(src[i])) {
                remove.push(i);
                src.splice(i, 1);
            }
        }
                    
        var insPos = target.length - src.length;    // number of new items
        var insert = new Array(insPos);
        for (var i = trgt.length-1; i >= 0; --i) {
            if (!srcHas(trgt[i])) {
                insert[--insPos] = [i, trgt[i]];
                trgt.splice(i, 1);
            }
        }
        
        var move = [];
        for (var i = 0; i < trgt.length; ++i) {
            if (same(src[i], trgt[i])) {
                var diff = getDiff(src[i], trgt[i]);
                if (diff !== NODIFF_OBJ) move.push([i, i, diff]);
            } else {
                var idx = getIdxInSrc(trgt[i], i+1);
                var moveArr = [idx, i];
                var diff = getDiff(src[idx], trgt[i]);
                if (diff !== NODIFF_OBJ) moveArr.push(diff);
                move.push(moveArr);
                src.splice(i, 0, src.splice(idx, 1)[0]);
            }
        }
        
        return remove.length + move.length + insert.length === 0 ? NODIFF_OBJ : {
            $_arrDiff: [remove, move, insert]
        };
    }
    
    /** ---- applying the diff ----- */
    
    function applyDiff(source, diff) {
        //if (source == null) return diff;  - No need
        
        if (isObject(diff)) {
            if (isArray(source) && diff.$_arrDiff) {
                return applyArrDiff(source, diff);
            }
            if (isObject(source)) {
                return applyObjDiff(source, diff);
            }
        }
        
        return diff;
    }
    
    function applyObjDiff(source, diff) {
        for (var key in diff) if (diff.hasOwnProperty(key)) {
            source[key] = applyDiff(source[key], diff[key]);
        }
        if (diff.$_removed) {
            diff.$_removed.forEach( function (key) {
                source[key] = undefined;    // we could `delete source[key];` but this is more efficient 
            });
        }
        return source;
    }
    
    function applyArrDiff(source, diff) {
        var arrDiff = diff.$_arrDiff;
        
        // remove
        arrDiff[0].forEach(function (idx) { source.splice(idx, 1); });
        
        // move
        arrDiff[1].forEach(function (move) {
            var item = source.splice(move[0], 1)[0];
            if (move.length > 2) item = applyDiff(item, move[2]);
            source.splice(move[1], 0, item);
        });
        
        // insert
        arrDiff[2].forEach(function (insert) {
            source.splice(insert[0], 0, insert[1]);
        });
        
        return source;
    }
        
    var Diff = {
        NODIFF_OBJ: NODIFF_OBJ,
        getDiff: getDiff,
        applyDiff: applyDiff
    };
    
    if (typeof module !== 'undefined') module.exports = Diff;
    else (this.pigod || (this.pigod = {})).Diff = Diff;

})();