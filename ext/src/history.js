
function History() {
}


History.prototype.search = function(year, month, day, callback) {
    var microsecondsPerDay = 1000 * 60 * 60 * 24;
    var sessionInterval = 1000 * 60 * 5;
    var start = new Date(year, month - 1, day);
    var end = new Date(start.getTime() + microsecondsPerDay - 1);
    Log.debug(start, end);
    var query = {
        "text": "",
        "startTime": start.getTime(), 
        "endTime" : end.getTime()
    };

    Log.debug((new Date(query.startTime)).format(), (new Date(query.endTime)).format());
    chrome.history.search(query, function(historyItems) {
        Log.debug("all historyItems:", historyItems.length);
        Log.debug("all historyItems:", historyItems);
        var vid2Visit = {};
        var itemsRemained = historyItems.length;
        _.each(historyItems, function(item) {
            if (/.*(s.weibo.com|chrome-extension:\/\/).*/.test(item.url)) {
                --itemsRemained;
                return;
            }
            chrome.history.getVisits({"url":item.url}, function(visits) {
                visits = _.filter(visits, function(v) { 
                    return v.visitTime >= query.startTime && v.visitTime <= query.endTime; 
                });
                for (var i = 0; i < visits.length; ++i) {
                    visits[i].item = item;
                    visits[i].time = new Date(visits[i].visitTime).format();
                    vid2Visit[visits[i].visitId] = visits[i];
                }   

                if (--itemsRemained === 0) {
                    Log.debug("all visits length:", _.keys(vid2Visit).length);
                    Log.debug("all visits:", vid2Visit);

                    for (var vid in vid2Visit) {
                        var refvid = vid2Visit[vid].referringVisitId;
                        if (vid2Visit[refvid]) {
                            vid2Visit[vid].parent = vid2Visit[refvid];
                            vid2Visit[refvid].children = vid2Visit[refvid].childrens || [];
                            vid2Visit[refvid].children.push(vid2Visit[vid]);
                        }
                    }

                    var roots = _.values(vid2Visit).filter(function(visit) {
                          return !(visit.parent);
                    });
                    console.log("roots length: ", roots.length);

                    roots = _.sortBy(roots, "visitTime");
                    console.log("sorted roots", roots);
                    for (var i = 1; i < roots.length; ++i) {
                        if (roots[i].visitTime - roots[i - 1].visitTime < sessionInterval
                                /*&& roots[i].transition === "link"*/ && !roots[i].parent) {
                            roots[i].parent = roots[i - 1];
                            roots[i - 1].children = roots[i - 1].children || [];
                            roots[i - 1].children.push(roots[i]);
                        }
                    }

                    roots = _.filter(roots, function(v) {
                        if (v.parent) return false;
                        if (!v.children && (v.visitTime < start.getTime() || v.visitTime > end.getTime())) return false;
                        return  (function traverse(n) {
                                    if (n.visitTime > start.getTime() && n.visitTime < end.getTime()) {
                                        return true;
                                    }
                                    for (var i = 0, len = n.children ? n.children.length : 0; i < len; ++i) {
                                        if (traverse(n.children[i])) {
                                            return true;
                                        }
                                    }
                                    return false;
                                })(v);
                    });

                    callback(roots);
                    Log.debug("trees", roots.length);
                    Log.debug("trees have child:", _.filter(roots, function(data) {
                        return data.children != undefined;    
                    }));
                }
            });
        });
    });
}


Date.prototype.format = function(format) {
    format = format || "yyyy-MM-dd hh:mm:ss";
    var o = {
        "M+" : this.getMonth() + 1,
        "d+" : this.getDate(),
        "h+" : this.getHours(),
        "m+" : this.getMinutes(),
        "s+" : this.getSeconds(),
        "q+" : Math.floor((this.getMonth() + 3) / 3),
        "S" : this.getMilliseconds()
    }

    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (this.getFullYear() + "")
                .substr(4 - RegExp.$1.length));
    }

    for (var k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k]
                    : ("00" + o[k]).substr(("" + o[k]).length));
        }
    }
    return format;
}
