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

    function getHasItem(array, indexOf) {
        var copy = null;
        return function (item) { 
            copy = copy || array.slice();
            var idx = indexOf(copy, item);
            if (idx >= 0) {
                copy.splice(idx, 1);
                return true;
            }
            return false;
        };
    }
    
    function pushDiff(source, target, arr) {
        var diff = getDiff(source, target);
        if (diff !== NODIFF_OBJ) arr.push(diff);
        return arr;
    }
    
    function tmpArrToJSON() {
        return {
            $_arr: this.slice(),
            $_tmpArr: this.$_tmpArr
        };
    }
    

    function arrayDiff(source, target) {
        var src = source.slice();  // clone the source array
        var trgt = target.slice(); // clone target 

        var idField = target.$_idField;
        var idFunc = target.$_idFunc ||     // use idFunc if provided
            idField && function (item) { return item[idField]; } ||     // generate idFunc from idField
            function (item) { return item; };    // id is the reference
        
        var tempItems = source.$_tmpArr || [];
        
        var indexOf = function (arr, item, startIdx) {
            var id = idFunc(item);
            for (var i = startIdx || 0; i < arr.length; ++i) if (idFunc(arr[i]) == id) return i;
            return -1;
        };
        
        var targetHas = getHasItem(trgt, indexOf);                
        var srcHas = getHasItem(src, indexOf);        
        
        var remove = [];
        for (var i = src.length-1; i >= 0; --i) {
            if (!targetHas(src[i])) {
                remove.push(i);
                tempItems.push(src.splice(i, 1)[0]);
            }
        }
                    
        var insPos = trgt.length - src.length;    // number of new items
        var insert = new Array(insPos);
        for (var i = trgt.length-1; i >= 0; --i) {
            if (!srcHas(trgt[i])) {
                insert[--insPos] = [i, trgt[i]];
                trgt.splice(i, 1);
            }
        }
        insert.forEach(function (ins) {
            var item = ins[1];
            var tmpIdx = indexOf(tempItems, item);
            if (tmpIdx >= 0) {
                var tmpItem = tempItems.splice(tmpIdx, 1)[0];
                ins[0] = ~ins[0];
                ins[1] = tmpIdx;
                pushDiff(tmpItem, item, ins);
            }
        });
        
        var move = [];
        for (var i = 0; i < trgt.length; ++i) {
            if (idFunc(src[i]) === idFunc(trgt[i])) {
                var diff = getDiff(src[i], trgt[i]);
                if (diff !== NODIFF_OBJ) move.push([~i, diff]);
            } else {
                var idx = indexOf(src, trgt[i], i+1);
                move.push(pushDiff(src[idx], trgt[i], [idx, i]));
                src.splice(i, 0, src.splice(idx, 1)[0]);
            }
        }
        
        if (tempItems.length) {
            target.$_tmpArr = tempItems;
            target.toJSON = tmpArrToJSON;
        }
        
        return remove.length + move.length + insert.length === 0 ? NODIFF_OBJ : {
            $_arrDiff: [remove, move, insert]
        };
    }
    
    /** ---- applying the diff ----- */
    
    function applyDiff(source, diff) {
        if (source == null) return decodeArrDiff(diff);
        
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
                delete source[key];    // Don't set it to `undefined`, that causes issues!
            });
        }
        return source;
    }
    
    function applyArrDiff(source, diff) {
        var arrDiff = diff.$_arrDiff;
        
        var tempItems = source.$_tmpArr || [];
        
        // remove
        arrDiff[0].forEach(function (idx) { tempItems.push(source.splice(idx, 1)[0]); });
        
        // move
        arrDiff[1].forEach(function (move) {
            var idx = move[0];
            if (idx < 0) {
                source[~idx] = applyDiff(source[~idx], move[1]);
            } else {
                var item = source.splice(idx, 1)[0];
                if (move.length > 2) item = applyDiff(item, move[2]);
                source.splice(move[1], 0, item);
            }
        });
        
        // insert
        arrDiff[2].forEach(function (insert) {
            var toIdx = insert[0];
            var what;
            
            if (toIdx < 0) {
                toIdx = ~toIdx;
                var fromIdx = insert[1];
                if (fromIdx >= tempItems.length) { console.log('ooops', fromIdx, tempItems.length); }
                what = tempItems.splice(fromIdx, 1)[0];
                if (insert.length > 2) what = applyDiff(what, insert[2]);
            } else {
                what = insert[1];
            }
            
            source.splice(toIdx, 0, what);
        });
        
        if (tempItems.length) source.$_tmpArr = tempItems;
        
        return source;
    }
    
    function decodeArrDiff(obj) {
        if (typeof obj === 'object') {
            var arr;
            if ((arr = obj.$_arr) && obj.$_tmpArr) {
                arr.$_tmpArr = obj.$_tmpArr;
                obj = arr;
                console.log('decoded $tmpArr with ' + arr.$_tmpArr.length + ' items');
            }
            for (var key in obj) {
                obj[key] = decodeArrDiff(obj[key]);
            }
        } 
        return obj;
    }
        
    var Diff = {
        NODIFF_OBJ: NODIFF_OBJ,
        getDiff: getDiff,
        applyDiff: applyDiff
    };
    
    if (typeof module !== 'undefined') module.exports = Diff;
    else (this.pigod || (this.pigod = {})).Diff = Diff;

})();