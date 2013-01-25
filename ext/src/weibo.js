var debug = true;
if (typeof(Weibo) == "undefined") {
    var Weibo = {};
}

Weibo.HOME_URL = "http://t.sina.com.cn/";
Weibo.API_BASE = "https://api.weibo.com";

Weibo.TIMELINE_API_URL = Weibo.API_BASE + "/statuses/user_timeline.json";
Weibo.GO_API_URL = Weibo.API_BASE + "/statuses/go";
Weibo.AUTHORIZE_URL = Weibo.API_BASE + '/oauth2/authorize';
Weibo.ACCESS_TOKEN_URL = Weibo.API_BASE + '/oauth2/access_token';
Weibo.AUTH_CALLBACK = "http://boundary.cc/diary_oauth_callback.html";

Weibo.CONSUMER_KEY = '2610228208';
Weibo.CONSUMER_SEC = '63d9e453132151664961c2b9535f4c07';

Weibo.access_token = '';
Weibo.access_token_secret = '';

Weibo.on_general_error = function(msg) {
    Log.debug(msg);
};

Weibo.on_network_error = function(aEvent) {
    Log.debug("network error: " + aEvent.target.status);
};

Weibo.oauth_authorize = function (callback) {
    if (!callback) {
        return;
    }
    chrome.tabs.getCurrent(function (tab) {
        delete localStorage['sina.oauth.code'];
        localStorage["app_tab_id"] = tab.id;
        var params = {
            'response_type': "code",
            'client_id': Weibo.CONSUMER_KEY,
            'redirect_uri': Weibo.AUTH_CALLBACK
        };
        var msg = Weibo.compose_urlparamstr(params);
        var url = Weibo.AUTHORIZE_URL + '?' + msg;
        Log.debug("auth code: " + url);
        chrome.tabs.create({"url": url});

        var access_token = function() {
            var code = localStorage['sina.oauth.code'];
            Log.debug("wait code...");
            if (code) {
                Log.debug("got code: " + code);
                Weibo.oauth_access_token(code, callback);
                return;
            }
            setTimeout(arguments.callee, 1000);
        };
        access_token();
    });
};

Weibo.oauth_access_token = function(code, callback) {
    var params = {
        "client_id": Weibo.CONSUMER_KEY,
        "client_secret": Weibo.CONSUMER_SEC,
        "grant_type": "authorization_code",
        "redirect_uri": Weibo.AUTH_CALLBACK,
        "code": code
    };
    $.post(Weibo.ACCESS_TOKEN_URL, params, function(data) {
        var json = JSON.parse(data);
        Log.debug("oauth_access_token()", json);
        localStorage["sina.oauth.access_token"] = json["access_token"];
        localStorage["sina.oauth.expires"]      =
            new Date().getTime() + json["expires_in"] * 1000;
        localStorage["sina.oauth.uid"]          = json["uid"];
        console.log(32142421);
        if (callback) {
            console.log(99999);
            callback();
        }
    });
};


Weibo.init = function(callback) {
    Log.debug("init()");
    // oauth first
    Weibo.access_token = localStorage['sina.oauth.access_token'];
    Weibo.access_token_secret = localStorage['sina.oauth.access_token_secret'];
    Log.debug("init(): access_token=" + Weibo.access_token);
};

Weibo.init_when_authed = function() {
    Log.debug("init_when_authed()");
};

Weibo.get_weibo = function(year, month) {
    var key = "sina.weibo.tweets." + year + "_" + month;
    return JSON.parse(localStorage[key] || "[]");
};

Weibo.download_audio = function(page) {

};

Weibo.goto_weibo = function(id) {
    var params = {
        "access_token": localStorage["sina.oauth.access_token"],
        "uid": localStorage["sina.oauth.uid"],
        "id": id
    };
    chrome.tabs.create({"url": Weibo.GO_API_URL + "?" + Weibo.compose_urlparamstr(params)});
};

Weibo.download_weibo = function(page, callback) {
    page = page || 1;
    console.log(555555);
    if (page === 1) {
        localStorage["sina.weibo.tweets.maxid.old"] =
            localStorage["sina.weibo.tweets.maxid"] || 0;
    }
    Log.debug("download_weibo(), page:" + page);
    var params = {
        "access_token": localStorage["sina.oauth.access_token"],
        "uid": localStorage["sina.oauth.uid"],
        "page": page,
        "count": 100,
        "trim_user": 1
    };
    Log.debug("params.access_token: " + params.access_token);
    $.getJSON(Weibo.TIMELINE_API_URL, params, function(data) {
        Log.debug("download_weibo() " + page, data);
        if (data.statuses && data.statuses.length > 0) {
            var maxIdInStorage = localStorage["sina.weibo.tweets.maxid.old"];
            var maxIdCurrent = data.statuses[0].id;
            if (maxIdCurrent <= maxIdInStorage) {
                return;
            }
            if (page === 1) {
                localStorage["sina.weibo.tweets.maxid"] = maxIdCurrent;
            }
            Weibo.download_weibo(page + 1, callback);
            Weibo.store_weibo(data.statuses);
        }
    });
    if (callback) {
        callback();
    }
};

Weibo.store_weibo = function(tweets) {
    var toadd = {};
    for (var i = 0; i < tweets.length; ++i) {
        var tweet = tweets[i];
        var time = new Date(tweet.created_at);
        var key = "sina.weibo.tweets." + time.getUTCFullYear() + "_" + (time.getMonth() + 1);
        toadd[key] = toadd[key] || [];
        toadd[key].push(tweet);
    }

    _.each(_.pairs(toadd), function(data) {
        var all = JSON.parse(localStorage[data[0]] || "[]");
        all = _.union(all, data[1]);
        localStorage[data[0]] = JSON.stringify(all);
    });
};

Weibo.clear_all_weibo = function() {
    for(var o in localStorage) { 
        if (o.search("sina.weibo.tweets") !== -1) {
            delete localStorage[o]
        }
    }
}

Weibo.compose_urlparamstr = function(dict) {
    var urlparams = [];
    for (var p in dict) {
        urlparams.push(p + '=' + encodeURIComponent(dict[p]));
    }
    return urlparams.join('&');
};

Weibo.decompose_urlparamstr = function(str) {
    var params = {};
    var urlparams = str.split('&');
    for (var i in urlparams) {
        var x = urlparams[i].split('=');
        params[x[0]] = x[1];
    }
    return params;
};

Weibo.on_general_error = function(msg) {
    console.log(msg);
};

Weibo.on_network_error = function(aEvent) {
    Weibo.on_general_error(": " + aEvent.target.status);
};

window.addEventListener("load", function(e){
    window.removeEventListener('load', arguments.callee, true);
    console.log(213213123);
    Weibo.init();
}, false);
