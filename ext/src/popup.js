window.addEventListener('DOMContentLoaded', function() {
    $("#open").click(function() {
        chrome.tabs.create({"url": "app.html"});
    });
}, false);
