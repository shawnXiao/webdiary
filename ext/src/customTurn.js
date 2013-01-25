(function () {
    var history, basePage, dayLimit, currentDay, 
        dayMillon, baseTime, today;
    var $ctn = $('.contain');
    var $win = $(window);
    var getWidth = $win.width();
    var getHeight = $win.height();
    var $book = $('#book');
    var $sizeBg = $('.prev-page .bg');
    var $sizeBgs = $('.book .s-bg');
    var w = getWidth - 300;
    var h = getHeight - 200;
    $sizeBg.height(h - 16);
    $sizeBgs.height(h - 39);

    dayMillon = 24 * 60 * 60 * 1000;
    dayLimit = dayMillon * 90;

    history = new History();
    today = new Date().getTime();
    baseTime = new Date((today - dayLimit)).getTime();
    basePage = "page-first-day";

    function initBase () {
        var dateObj, selector, oauthFlag;

        oauthFlag = 2;
        if (!!!localStorage["sina.oauth.uid"]) {
           $(".weibo-btn").show(); 
           oauthFlag --;
        }

        if (!!!localStorage["douban.oauth.uid"]) {
            $(".douban-btn").show();
               oauthFlag --;
        }

        if (oauthFlag) {
            $(".contain ul").show();
        }

        dateObj = new Date(baseTime);
        selector = "#" + basePage + " .container";
        console.log("selector: ", selector);
        history.search(dateObj.getUTCFullYear(), dateObj.getMonth() + 1,
                      dateObj.getDate(), function (data) {
                    _.each(data, function (itemData) {
                            treeBuilder.buildTree(itemData, selector);
                            });
          });

    }
    initBase();

    function isLastDay(dt) {
        var test = new Date(dt.getTime());
        test.setDate(test.getDate() + 1);
        return test.getDate() === 1;
    }

    function addPage (page) {
        var monthLength, thisPageDay, element, selector, pid, dateObj,
            isPreviousTweets, baseDateObj;
        if (!$book.turn('hasPage', page)) {

            if (page > 90) {
                if (!!!localStorage["sina.oauth.uid"] && !!!localStorage["douban.oauth.uid"]) {
                    return;
                }

                isPreviousTweets = true;
                monthLength = page - 91;
                baseDateObj = new Date(baseTime);
                console.log(baseDateObj.getMonth() - monthLength);

                dateObj = new Date(baseDateObj.getUTCFullYear(), (baseDateObj.getMonth() - monthLength), 0);
                console.log(dateObj);
                pid = "page-previouse" + page;
                selector = "#" + pid + " .container";
                element = $("<div />", {"id": pid, "class": "page"}).html(
                    "<div class='container'></div><span class='pageNum'>"
                    +"<b>" + (baseDateObj.getMonth() - monthLength -1) + "月社交信息</b></span>");
                $book.turn("addPage", element, page);
            } else {
                dayLength = page * dayMillon;
                thisPageDay = baseTime  + dayLength;
                dateObj = new Date(thisPageDay);
                pid = "page-" + thisPageDay;
                selector = "#" + pid + " .container";
                
                element = $("<div />", {"id": pid, "class": "page"}).html(
                    "<div class='container'></div><span class='pageNum'>"
                    +"<b>" + (new Date(thisPageDay)).format() + "</b></span>");
                $book.turn("addPage", element, page);
     
            }

           console.log("Page: ", page);
            setTimeout(function () {
                if (isLastDay(dateObj) || isPreviousTweets) {
                    console.log("This is last Day");
                    var tweets = Weibo.get_weibo(dateObj.getUTCFullYear(), dateObj.getMonth());
                    var books = Douban.get_douban(dateObj.getUTCFullYear(), dateObj.getMonth());
                    $(selector).append("<div class='group-wrap'></div>");
                     _.each(tweets, function(t) {
                            $("#" + pid + " .group-wrap") .append(
                  "<div class='group-ctn' data-id=" + t.id + ">" 
                      + "<h3>" + new Date(t.created_at).format() + "</h3>"
                      + "<div class='text'>" + t.text + "</div>"
                      + (t.thumbnail_pic ? "<img src=" + t.thumbnail_pic + "></img>" : "")
                  + "</div>");
                    });

                    _.each(books, function(b) {
                        var st = {
                            "read": "读过",
                            "wish": "想读",
                            "reading" : "在读",
                        };
                    $("#" + pid + " .group-wrap") .append(
                  "<div class='group-ctn' data-url=" + b.book.url + ">" 
                      + "<h3>" + new Date(b.updated).format() + "</h3>"
                      + "<div class='text'>" + st[b.status] + ": 《" + b.book.title  + "》</div>"
                      + "<img src=" + b.book.image + "></img>"
                  + "</div>");
            
                    });
                    return;
                }
                history.search(dateObj.getUTCFullYear(), dateObj.getMonth() + 1,
                              dateObj.getDate(), function (data) {
                                  console.log("selector:", selector);
                                  console.log("selector.length", $(selector).length);
                                  console.log("Show data:", data);
                            _.each(data, function (itemData) {
                                    treeBuilder.buildTree(itemData, selector);
                                    });
                      });
            }, 1000);
        }

    }

    $book.turn({
        width: w,
        height: h,
        pages: 100,
        page: 85,
        display: 'single',
        acceleration: true,
        when: {
            turning: function (e, page, view) {

                var range = $(this).turn('range', page);
                console.log("range from " + range[0] + " to " + range[1]);
                for (page = range[0]; page <= range[1]; page++) {
                    addPage(page);
                }
            },
            turned: function () {
            }
        }
    });

    $book.fadeTo(100, 1);

    $win.bind('keydown', function(e){
        if (e.keyCode == 37){
            $book.turn('previous');
        }
        else if (e.keyCode==39){
            $book.turn('next');
        }
    });
    $book.delegate('.next-page', 'click', function(){
        $book.turn('next');
    });

    $(document).delegate('.weibo-btn', 'click', function () {
        var showUl, downLoadWeibo;

        
        showUl = function () {
            console.log(4395803458);
            $(".weibo-btn").hide();
            $(".contain ul").show();
        };
        downLoadWeibo = function () {
            Weibo.download_weibo(1, showUl);
        };
        Weibo.oauth_authorize(downLoadWeibo);
    });
    $(document).delegate('.douban-btn', 'click', function () {
        var showUl, downLoadWeibo;

        showUl = function () {
            $(".douban-btn").hide();
            $(".contain ul").show();
        };
        downLoadWeibo = function () {
            Douban.download_book(1, showUl);
        };
        Douban.oauth_authorize(downLoadWeibo);
 
    });

    $(document).delegate(".-confirm-date", "click", function () {
        var selectYear, selectMonth, selectDay, temptDiv, fragement, i, dateObj, pageNumber;

        selectYear = $("#year").find(":selected").val();
        selectMonth = $("#month").find(":selected").val();
        selectDay = $("#day").find(":selected").val();
        dateObj = new Date(selectYear + "-" + selectMonth + "-" +selectDay);
        pageNumber = Math.round(((dateObj - baseTime) / dayMillon));
        $book.turn('page', pageNumber);

    });
    
    $(document).delegate(".group-ctn", "click", function() {
        Weibo.goto_weibo($(this).data("id"));
    });
    
    $(document).delegate("#right-nav li", "click", function() {
        var year = /([0-9]+)年/.exec($(this).text())[1] >>> 0;
        var month = /([0-9]+)月/.exec($(this).text())[1] >>> 0;
        var dateObj = new Date(year, month, 0);
        var pageNumber;
        $(this).addClass('active').siblings().removeClass('active');
        pageNumber = Math.round(((dateObj - baseTime) / dayMillon));
        if (pageNumber < 0) {
            pageNumber = Math.round(Math.abs(pageNumber) / 30) + 89;
        }

        $book.turn('page', pageNumber);
    });
    
    // resize screen
    var screenFix = function () {
        getWidth = $win.width();
        getHeight = $win.height();
        w = getWidth - 300;
        h = getHeight - 200;
        $sizeBg.height(h - 16);
        $sizeBgs.height(h - 39);
        $book.turn("size", w, h);
    };
    $win.bind("resize", _.throttle(screenFix, 200));
}());
