var debug = true;
if (typeof(Douban) == "undefined") {
    var Douban = {};
}

Douban.API_BASE = "https://api.douban.com/v2"
Douban.AUTH_API_BASE = "https://www.douban.com/service";

Douban.USER_API_URL = Douban.API_BASE + "/user/~me"
Douban.BOOK_API_URL = Douban.API_BASE + "/book/user/:name/collections";
Douban.GO_API_URL = Douban.API_BASE + "/statuses/go";
Douban.AUTHORIZE_URL = Douban.AUTH_API_BASE + '/auth2/auth';
Douban.ACCESS_TOKEN_URL = Douban.AUTH_API_BASE + '/auth2/token';
Douban.AUTH_CALLBACK = "http://boundary.cc/diary_oauth_callback.html?site=douban"

Douban.CONSUMER_KEY = '05587fe50bfc984910097faf23f5c8db';
Douban.CONSUMER_SEC = '457bf387553cd355';

Douban.access_token = '';
Douban.access_token_secret = '';

Douban.on_general_error = function(msg) {
    Log.debug(msg);
};

Douban.on_network_error = function(aEvent) {
    Log.debug("network error: " + aEvent.target.status);
};

Douban.oauth_authorize = function(callback) {
    chrome.tabs.getCurrent(function (tab) {
        delete localStorage['douban.oauth.code'];
        localStorage["app_tab_id"] = tab.id;
        var params = {
            'response_type': "code",
            'client_id': Douban.CONSUMER_KEY,
            'redirect_uri': Douban.AUTH_CALLBACK
        };
        var msg = Douban.compose_urlparamstr(params);
        var url = Douban.AUTHORIZE_URL + '?' + msg;
        Log.debug("auth code: " + url);
        chrome.tabs.create({"url": url});

        (function() {
            var code = localStorage['douban.oauth.code'];
            Log.debug("wait code...");
            if (code) {
                Log.debug("got code: " + code);
                Douban.oauth_access_token(code, callback);
                return;
            } 
            setTimeout(arguments.callee, 1000);
        })();
    });
};

Douban.oauth_access_token = function(code, callback) {
    Log.debug("oauth_access_token()");
    var params = {
        "client_id": Douban.CONSUMER_KEY,
        "client_secret": Douban.CONSUMER_SEC,
        "grant_type": "authorization_code",
        "redirect_uri": Douban.AUTH_CALLBACK,
        "code": code
    };
    $.post(Douban.ACCESS_TOKEN_URL, params, function(data) {
        var json = JSON.parse(data);
        Log.debug("oauth_access_token()", json);
        localStorage["douban.oauth.access_token"] = json["access_token"];
        localStorage["douban.oauth.refresh_token"]= json["refresh_token"];
        localStorage["douban.oauth.expires"]      = new Date().getTime() + json["expires_in"] * 1000;
        if (callback) {
            callback();
        }
    });
};

Douban.get_user_info = function(callback) {
    $.getJSON(Douban.USER_API_URL, {}, function(data) {
        localStorage["douban.oauth.uid"] = data["uid"];
        localStorage["douban.oauth.avatar"] = data["avatar"];
        localStorage["douban.oauth.profile"] = data["alt"];
        if (_.isFunction(callback)) {
            callback(data);
        }
    });
};

Douban.init = function() {
    Log.debug("init()");
    // oauth first
    Douban.access_token = localStorage['douban.oauth.access_token'];
    Douban.access_token_secret = localStorage['douban.oauth.access_token_secret'];
    Log.debug("init(): access_token=" + Douban.access_token);
    if (Douban.access_token == '') {
        Douban.oauth_authorize();
    } else {
        Douban.init_when_authed();
    }
};

Douban.init_when_authed = function() {
    Log.debug("init_when_authed()");
};

Douban.get_douban = function(year, month) {
    var key = "douban.books." + year + "_" + month;
    return JSON.parse(localStorage[key] || "[]");
};

Douban.download_audio = function(page) {

};

Douban.goto_douban = function(id) {
    var params = {
        "access_token": localStorage["douban.oauth.access_token"],
        "uid": localStorage["douban.oauth.uid"],
        "id": id
    };
    chrome.tabs.create({"url": Douban.GO_API_URL + "?" + Douban.compose_urlparamstr(params)});
};

Douban.download_book = function(start, callback) {
    start = start || 0;
    if (start === 0) {
        localStorage["douban.books.maxid.old"] 
                = localStorage["douban.books.maxid"] || 0;
    }
    Log.debug("download_book()", start);
    var uid = localStorage["douban.oauth.uid"];
    if (!uid) {
        Douban.get_user_info(function(data) {
            download(data["uid"]);
        });
    } else {
        download(uid);
    }

    function download(uid) {
        var url = Douban.API_BASE + "/book/user/" + uid + "/collections";
        $.getJSON(url, {"count": 100, "start": start}, function(data) {
            Log.debug("download(): " + url, data);
            if (data && data.collections && data.collections.length > 0) {
                var maxIdInStorage = localStorage["douban.books.maxid.old"];
                var maxIdCurrent = data.collections[0].id;
                if (maxIdCurrent <= maxIdInStorage) {
                    if (callback) {
                        callback();
                    }
                    return;
                }
                if (start === 0) {
                    localStorage["douban.books.maxid"] = maxIdCurrent;
                }
                Douban.download_book(start + 100);
                Douban.store_books(data.collections);
            }
        });
    }
};

Douban.store_books = function(books) {
    var toadd = {};
    for (var i = 0; i < books.length; ++i) {
        var book = books[i];
        var time = new Date(book.updated);
        var key = "douban.books." + time.getUTCFullYear() + "_" + (time.getMonth() + 1);
        toadd[key] = toadd[key] || [];
        toadd[key].push(book);
    }

    _.each(_.pairs(toadd), function(data) {
        var all = JSON.parse(localStorage[data[0]] || "[]");
        all = _.union(all, data[1]);
        localStorage[data[0]] = JSON.stringify(all);
    });
}

Douban.clear_all_douban = function() {
    for(var o in localStorage) { 
        if (o.search("sina.Douban.tweets") !== -1) {
            delete localStorage[o]
        }
    }
}

Douban.compose_urlparamstr = function(dict) {
    var urlparams = [];
    for (var p in dict) {
        urlparams.push(p + '=' + encodeURIComponent(dict[p]));
    }
    return urlparams.join('&');
};

Douban.decompose_urlparamstr = function(str) {
    var params = {};
    var urlparams = str.split('&');
    for (var i in urlparams) {
        var x = urlparams[i].split('=');
        params[x[0]] = x[1];
    }
    return params;
};

Douban.on_general_error = function(msg) {
    console.log(msg);
};

Douban.on_network_error = function(aEvent) {
    Douban.on_general_error(": " + aEvent.target.status);
};

window.addEventListener("load", function(e){
    window.removeEventListener('load', arguments.callee, true);
    Douban.init();
}, false);
