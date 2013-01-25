if (typeof(Log) == "undefined") {
    var Log = {};
}

Log.debug = function(msg, obj) {
    if (debug === undefined || debug === false) {
        return;
    }
    if (obj) {
        console.log("[diary] ", msg, obj);
    } else {
        console.log("[diary] ", msg);
    }
}
