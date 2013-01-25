(function () {
    var data = /code=([0-9a-z]+)/.exec(location.search);
    if (data && data[1]) {
        var site = location.search.indexOf("douban") != -1 ? "douban" : "sina";
        localStorage[site + ".oauth.code"] = data[1];
        var prevtab = localStorage['app_tab_id'];
        localStorage['app_tab_id'] = '';
        if (prevtab) {
            chrome.tabs.update(parseInt(prevtab[1]), {"active": true}, null);
        }
        chrome.tabs.getCurrent(function (tab) {
            chrome.tabs.remove(tab.id);
        });
    }
})();
