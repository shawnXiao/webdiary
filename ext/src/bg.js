chrome.extension.onRequest.addListener(function(req, sender, callback) {
    console.log('receive request:', req);
    switch (req.type) {
        case 'post':
            $.post(req.url, req.params, function (data) {
                callback(data);
            });
            break;
        default: break;
    }
});


