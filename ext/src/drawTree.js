(function (window) {
    var buildTree;
    treeBuilder = {
        config: {
            nodeRadius: 10,
            fontSize: 12,
            maxWidth: 998,
            perWidth: 100,
            element: {
                baseInfoQ: ".-popover-base-info",
                baseTitleQ: ".-data-title",
                baseVisitTimeQ: ".-data-visitTime",
                baseUrlQ: ".-data-url",
                extendInfoQ: ".-popover-extension-info", 
                extendImageWrapperQ: ".-image-wrapper",
                extendContentQ: ".-content-wrapper"
            },
            colorMap:{},
            colorList: ["blanchedAlmond", "burlyWood", "cadetBlue", "darkGoldenRod", "deepSkyBlue", "mediumAquamarine", "oliveDrab", "peru"],
            hoverMessage:{}
        },

        visit: function (parent, visitFn, childrenFn) {
            var children, count, i;
            if (!parent) {
                return;
            }

            visitFn(parent);
            children = childrenFn(parent);

            if (children) {
                count = children.length;
                for (i = 0; i < count; i ++) {
                    arguments.callee(children[i], visitFn, childrenFn);
                }
            }
        },

        buildTree: function (dailyData, containerName, customOptions) {
            var options, totalNodes, maxLabelLength, size, temptWidth;
            
            size = {};
            options = $.extend(treeBuilder.config, customOptions);
            options.data = dailyData;
            options.containerName = containerName;
            
            totalNodes = 0;
            maxLabelLength = 0;

            treeBuilder.visit(dailyData, function (d) {
                totalNodes += 1;
                if (d.item) {
                    d.item.hostname = treeBuilder.toLocation(d.item.url).hostname;
                    maxLabelLength = Math.max(d.item.hostname.length, maxLabelLength);
                } else {
                    maxLabelLength = Math.max(d.id.length, maxLabelLength);
                }
            }, function (d) {
                return d.children && d.children.length > 0 ? d.children : null;
            });

            options.maxLabelLength = maxLabelLength; 
            temptWidth = (totalNodes + 1) * options.perWidth;
            size.width = temptWidth > options.maxWidth ? options.maxWidth : temptWidth;

            var leafs = (function (node) {
                                  if (!node.children) {
                                    return 1;
                                  }
                                  var sum = 0;
                                  for (var i = 0; i < node.children.length; ++i) {
                                    sum += arguments.callee(node.children[i]);
                                  }
                                  return sum;
                              })(options.data);
            size.height = 35 * leafs;
            options.size = size;
            treeBuilder.paintTree();
        },

        toLocation: function (url) {
            var anchor;
            anchor = document.createElement('a');
            anchor.href = url;

            return anchor;
        },

        paintTree: function () {
            var tree, nodes, links, link, nodeGroup,
                containerName, conf, size, popoverTimer;

            conf = treeBuilder.config;
            size = conf.size;
            dailyData = conf.data;
            tree = d3.layout.tree().
                sort(null).
                size([size.height, size.width - conf.maxLabelLength * conf.fontSize]).
                children(function (d, i) {
                    return (!d.children || d.children.length === 0) ? null :
                            d.children;
                });

            nodes = tree.nodes(dailyData);
            links = tree.links(nodes);

            layoutRoot = d3.select(conf.containerName).
                append("svg:svg").
                    attr("width", size.width).
                    attr("height", size.height).
                append("svg:g").
                    attr("class", "container").
                    attr("transform", "translate(" + conf.maxLabelLength + ", 0)");

            link = d3.svg.diagonal().
                projection(function (d) {
                    return [d.y, d.x];
                });

            layoutRoot.selectAll("path.link").
                data(links).
                enter().
                append("svg:path").
                attr("class", "link").
                attr("d", link);

            nodeGroup = layoutRoot.selectAll("g.node").
                data(nodes).
                enter().
                append("svg:g").
                attr("class", "node").
                attr("transform", function (d) {
                    return "translate(" + d.y + ", " + d.x + ")";
                });

            nodeGroup.append("svg:circle").
                attr("class", "node-dot").
                attr("r", conf.nodeRadius).
                style("fill", function (d) {
                    var parentNode, currentItem, colorMap, colorList;
                    
                    if (!d.item) {
                        return "oldLace";
                    }
                    colorMap = conf.colorMap;
                    colorList = conf.colorList;
                    currentItem = d.item;

                    var host = currentItem.hostname;
                    if (!colorMap.hasOwnProperty(host)) {
                        colorMap[host] = colorList[_.keys(colorMap).length % colorList.length];
                    }
                    return colorMap[host];
                }).
                on("mouseover", function (d) {
                    var targetUrl, itemUrl, itemInfo, extendInfo, thisTarget, coord;

                    coord = {};
                    thisTarget = d3.select(this);
                    coord.x = $(this).offset().left + 40;
                    coord.y = $(this).offset().top + 30;
                    element = conf.element;
                    itemInfo = d.item;
                    itemUrl = itemInfo.url;

                    if ($(".popover").length > 0) {
                        $(".popover").remove();
                    }

                    $("footer").after(
                                        "<div class='popover' "
                                        + "style='left: " +coord.x + "px;top: "+coord.y+"px'>"
                                        + "<i class='arrow'></i>"
                                        + "<div class='hd'>"
                                            + "<h3>" +itemInfo.title+ "</h3>"
                                        + "</div>"
                                            + "<p class='visitTime'>上次访问时间：" +(new Date(itemInfo.lastVisitTime).format())+ "</p>"
                                            + "<a href=" + itemInfo.url+ "  target='_blank'>" +itemInfo.url+ "</a>"
                                       + "</div>");

                    if ((conf.hoverMessage).hasOwnProperty(itemUrl)) {
                        extendInfo = conf.hoverMessage[itemUrl].product;
                    } else {
                        targetUrl = "http://tb118x.corp.youdao.com:10010/urls?urls=" +
                                encodeURIComponent(itemUrl);
                        $.ajax({
                            type: "GET",
                            url: targetUrl 
                        }).done(function (data) {
                            if (data && data.type === "product") {
                                $.extend(conf.hoverMessage, data);
                                extendInfo = data;
                            }
                        });
                    }

                    if (extendInfo) {
                        $(".popover").append(
                                             "<div class='extend-info'"
                                             + "<div class='image-wrapper'>"
                                                 + "<img src='"+extendInfo.imgUrl+"'"
                                                 +" alt=' " +extendInfo.name+ "'>"
                                             + "</div>"
                                             + "<div class='content-wrapper'"
                                             + "<a href=' " +extendInfo.url+ " '"
                                                 +"title='" +extendInfo.name+ "'>"+extendInfo.name+"</a>"
                                             + "<strong>" +extendInfo.price+ "</strong>"
                                             + "</div>"
                                             + ""
                                             );
                    }

                }).
                on("mouseout", function () {
                    popoverTimer = setTimeout(function (){
                        $(".popover").remove();
                    }, 2000);
                });
            $(document).delegate(".popover", "mouseenter", function () {
                if (popoverTimer) {
                    clearTimeout(popoverTimer);
                }
            });

            nodeGroup.append("svg:text").
                attr("text-anchor", function (d) {
                    return "start";
                }).attr("dx", function (d) {
                    return conf.maxLabelLength;
                }).attr("dy", function (d, i) {
                    return d.depth % 2 === 0 ? -5 : 5;
                }).
                text(function (d) {
                    var parentNode, currentItem;
                    
                    if (!d.item) {
                        return d.id;     
                    }
                    currentItem = d.item;
                    parentNode = d.parent;

                    if (parentNode && parentNode.item) {
                        if (currentItem.hostname === parentNode.item.hostname) {
                            d3.select(this).style("fill", "aliceblue");
                            return '';
                        }
                    }
                    return (function(host) {
                                return host.replace(/www\.|\.com|\.cn/g, "");
                            })(d.item.hostname);
                });
        },

        renderExtendInfo: function (extendInfo) {
            var element, conf;
            conf = treeBuilder.config;
            element = conf.element;

            $(element.extendImageWrapperQ + " img").attr("src", extendInfo.imgUrl);
            $(element.extendImageWrapperQ + " img").attr("alt", extendInfo.name);
            $(element.baseInfoQ).append(element.extendInfoQ);

        }

    };

    window.treeBuilder = treeBuilder;
}(window, undefined));

